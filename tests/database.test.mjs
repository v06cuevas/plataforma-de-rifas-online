import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createTestDatabase } from './helpers/database.mjs';

const files = await Promise.all(
  ['supabase_schema.sql', 'STORAGE_SETUP.sql', 'HABILITAR_REALTIME.sql', 'AGREGAR_PRIZE_DETAILS.sql']
    .map((file) => readFile(new URL('../' + file, import.meta.url), 'utf8'))
);
// gen_random_uuid() está incluido en PostgreSQL; PGlite no distribuye pgcrypto.
const schema = (await readFile(new URL('../SUPABASE_COMPLETO.sql', import.meta.url), 'utf8'))
  .replace('create extension if not exists "pgcrypto";', '');
const alice = '10000000-0000-0000-0000-000000000001';
const bob = '10000000-0000-0000-0000-000000000002';
const admin = '10000000-0000-0000-0000-000000000003';
const raffle = '20000000-0000-0000-0000-000000000001';
const hidden = '20000000-0000-0000-0000-000000000002';
const conversation = '30000000-0000-0000-0000-000000000001';

test('Esquema Supabase y reglas de compra en PostgreSQL local', async (t) => {
  const db = await createTestDatabase();
  t.after(() => db.close());

  const scalar = async (sql, args = []) => (await db.query(sql, args)).rows[0];
  async function asUser(role, id, work) {
    await db.exec('set role ' + role);
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id || '']);
    try { return await work(); }
    finally {
      await db.exec('reset role');
      await db.query("select set_config('request.jwt.claim.sub', '', false)");
    }
  }
  const checkout = (numbers, bonus = [], amount = (numbers.length - bonus.length) * 10, overrides = {}) => {
    const values = {
      raffle, numbers, bonus, amount, bank: 'Banco de prueba', reference: crypto.randomUUID(),
      name: 'Comprador', phone: '123456789', email: 'comprador@example.com', cedula: null,
      receipt: alice + '/receipt.pdf', ...overrides,
    };
    return scalar(`select public.submit_payment_report(
      $1::uuid, $2::text[], $3::text[], $4::numeric, $5, $6, $7, $8, $9, $10, $11
    ) as report`, Object.values(values));
  };

  await t.test('el SQL único instala todo desde cero, se puede repetir y es compatible con los originales', async () => {
    for (let pass = 0; pass < 2; pass++) {
      await db.exec(schema);
    }
    for (const sql of files) await db.exec(sql.replace('create extension if not exists "pgcrypto";', ''));
    const row = await scalar(`select count(*)::int as total from pg_publication_tables
      where pubname = 'supabase_realtime'`);
    assert.equal(row.total, 6);
    assert.equal((await scalar("select public from storage.buckets where id = 'payment-receipts'")).public, false);
  });

  await db.query(`insert into auth.users (id, email, raw_user_meta_data) values
    ($1, 'alice@example.com', '{"full_name":"Alice","phone":"123456789","cedula_or_id":"123","role":"admin"}'),
    ($2, 'bob@example.com', '{"full_name":"Bob","phone":"987654321"}'),
    ($3, 'admin@example.com', '{"full_name":"Admin","phone":"111111111"}')`, [alice, bob, admin]);
  await db.query("update public.users set role = 'admin' where id = $1", [admin]);
  await db.query(`insert into public.raffles (id, title, ticket_price, total_tickets, status,
    has_bonus_promotion, bonus_buy_threshold, bonus_free_tickets) values
    ($1, 'Rifa pública', 10, 100, 'active', true, 2, 1),
    ($2, 'Borrador privado', 10, 100, 'draft', false, null, null)`, [raffle, hidden]);
  await db.exec("insert into public.bank_accounts (bank_name, account_number) values ('Banco de prueba', '123')");
  await db.query(`insert into storage.objects (bucket_id, name) values
    ('payment-receipts', $1), ('payment-receipts', $2), ('raffle-media', 'cover.jpg')`,
    [alice + '/receipt.pdf', bob + '/receipt.pdf']);

  await t.test('el registro conserva la cédula y fuerza el rol client', async () => {
    const user = await scalar('select role, cedula_or_id from public.users where id = $1', [alice]);
    assert.deepEqual(user, { role: 'client', cedula_or_id: '123' });
  });

  let payment;
  await t.test('el pedido vincula todos los boletos y marca la promoción', async () => {
    payment = (await asUser('authenticated', alice, () => checkout(['1', '2', '3'], ['3']))).report;
    assert.equal(payment.amount, 20);
    const tickets = (await db.query(`select ticket_number, price_paid, is_bonus_ticket, payment_report_id
      from public.tickets where payment_report_id = $1 order by ticket_number`, [payment.id])).rows;
    assert.equal(tickets.length, 3);
    assert.equal(tickets[2].ticket_number, '00003');
    assert.equal(tickets[2].price_paid, '0.00');
    assert.equal(tickets[2].is_bonus_ticket, true);
    assert.ok(tickets.every((ticket) => ticket.payment_report_id === payment.id));
  });

  await t.test('un conflicto revierte el reporte y todos los boletos del pedido', async () => {
    await assert.rejects(asUser('authenticated', alice, () => checkout(['4', '1'])), /reservado/);
    assert.equal((await scalar("select count(*)::int as total from public.tickets where ticket_number = '00004'")).total, 0);
    assert.equal((await scalar('select count(*)::int as total from public.payment_reports')).total, 1);
  });

  await t.test('no admite importes ni promociones manipulados', async () => {
    await assert.rejects(asUser('authenticated', alice, () => checkout(['5'], [], 1)), /importe/);
    await assert.rejects(asUser('authenticated', alice, () => checkout(['5', '6'], ['6'])), /promoción/);
    await assert.rejects(asUser('authenticated', alice, () => checkout(['5'], ['6'])), /formar parte/);
  });

  await t.test('valida duplicados, números, banco, estado y propiedad del comprobante', async () => {
    for (const numbers of [['1', '0001'], ['0'], ['2147483648'], ['abc'], [null], []]) {
      await assert.rejects(asUser('authenticated', alice, () => checkout(numbers)));
    }
    await assert.rejects(asUser('authenticated', alice, () => checkout(['5'], [], 10, { bank: 'Inexistente' })), /bancaria/);
    await assert.rejects(asUser('authenticated', alice, () => checkout(['5'], [], 10, { raffle: hidden })), /activa/);
    await assert.rejects(asUser('authenticated', alice, () => checkout(['5'], [], 10, { receipt: bob + '/receipt.pdf' })), /comprobante/);
    await assert.rejects(asUser('authenticated', alice, () => checkout(['5'], [], 10, { receipt: alice + '/missing.pdf' })), /comprobante/);
  });

  await t.test('un cliente no puede insertar pagos verificados ni alterar boletos', async () => {
    await assert.rejects(asUser('authenticated', alice, () => db.query(`insert into public.payment_reports
      (raffle_id, user_id, sender_name, sender_phone, destination_bank, reference_number, amount, status)
      values ($1, $2, 'Alice', '123', 'Banco', 'FAKE', 10, 'verified')`, [raffle, alice])), /row-level security/);
    const result = await asUser('authenticated', alice, () => db.query(`update public.tickets
      set status = 'confirmed' where payment_report_id = $1 returning id`, [payment.id]));
    assert.equal(result.rows.length, 0);
    await assert.rejects(asUser('authenticated', alice, () => db.query('select public.reserve_ticket($1, $2, $3)', [raffle, '5', 10])), /permission denied/);
  });

  await t.test('RLS protege los datos ajenos y los borradores; las estadísticas son globales', async () => {
    await asUser('authenticated', bob, async () => {
      assert.equal((await scalar('select count(*)::int as total from public.tickets')).total, 0);
      assert.equal((await scalar('select count(*)::int as total from public.payment_reports')).total, 0);
      assert.equal((await scalar('select count(*)::int as total from public.raffle_stats')).total, 1);
      assert.equal((await scalar('select reserved_tickets_count::int as total from public.raffle_stats where raffle_id = $1', [raffle])).total, 3);
    });
    await asUser('anon', null, async () => {
      assert.equal((await scalar('select count(*)::int as total from public.raffles')).total, 1);
      assert.equal((await scalar('select count(*)::int as total from public.raffle_stats')).total, 1);
      await assert.rejects(checkout(['5']), /permission denied/);
    });
  });

  await t.test('la disponibilidad pública exige una rifa visible y solo expone números', async () => {
    await asUser('anon', null, async () => {
      assert.deepEqual((await scalar('select public.get_taken_ticket_numbers($1) as numbers', [raffle])).numbers, ['00001', '00002', '00003']);
      assert.deepEqual((await scalar('select public.get_taken_ticket_numbers($1) as numbers', [hidden])).numbers, []);
    });
  });

  await t.test('solo un administrador puede revisar pagos y la aprobación usa el enum correcto', async () => {
    await assert.rejects(asUser('authenticated', alice, () => scalar('select public.review_payment_report($1, true)', [payment.id])), /administrador/);
    await asUser('authenticated', admin, () => db.query('select public.review_payment_report($1, true)', [payment.id]));
    assert.equal((await scalar('select status from public.payment_reports where id = $1', [payment.id])).status, 'verified');
    assert.equal((await scalar("select count(*)::int as total from public.tickets where status = 'confirmed'")).total, 3);
    assert.equal((await scalar('select count(*)::int as total from public.audit_logs')).total, 1);
    await assert.rejects(asUser('authenticated', admin, () => db.query('select public.review_payment_report($1, false)', [payment.id])), /ya fue revisado/);
    await assert.rejects(asUser('authenticated', admin, () => db.query('select public.review_payment_report($1, true)', [crypto.randomUUID()])), /No se encontró/);
  });

  await t.test('rechazar un pago libera sus números para otro comprador', async () => {
    const rejected = (await asUser('authenticated', alice, () => checkout(['5']))).report;
    await asUser('authenticated', admin, () => db.query('select public.review_payment_report($1, false)', [rejected.id]));
    await asUser('authenticated', bob, () => checkout(['5'], [], 10, { receipt: bob + '/receipt.pdf' }));
    assert.equal((await scalar("select count(*)::int as total from public.tickets where ticket_number = '00005' and status = 'pending_payment'")).total, 1);
  });

  await t.test('el cliente no puede cambiar su rol ni desbloquear su cuenta', async () => {
    await assert.rejects(asUser('authenticated', alice, () => db.query("update public.users set role = 'admin' where id = $1", [alice])), /rol/);
    await assert.rejects(asUser('authenticated', alice, () => db.query("update public.users set status = 'vip' where id = $1", [alice])), /estado/);
    await asUser('authenticated', admin, () => db.query("update public.users set status = 'blocked' where id = $1", [bob]));
    await assert.rejects(asUser('authenticated', bob, () => checkout(['6'], [], 10, { receipt: bob + '/receipt.pdf' })), /habilitada/);
  });

  await t.test('soporte impide suplantar mensajes del administrador', async () => {
    await asUser('authenticated', alice, () => db.query(`insert into public.support_conversations
      (id, user_id, subject) values ($1, $2, 'Ayuda')`, [conversation, alice]));
    await assert.rejects(asUser('authenticated', alice, () => db.query(`insert into public.support_messages
      (conversation_id, sender, sender_id, sender_name, message) values ($1, 'admin', $2, 'Admin', 'Falso')`, [conversation, alice])), /row-level security/);
    await asUser('authenticated', alice, () => db.query(`insert into public.support_messages
      (conversation_id, sender, sender_id, sender_name, message) values ($1, 'user', $2, 'Alice', 'Consulta')`, [conversation, alice]));
  });

  await t.test('Storage permite portadas públicas y comprobantes privados por propietario', async () => {
    await asUser('anon', null, async () => {
      assert.equal((await scalar("select count(*)::int as total from storage.objects where bucket_id = 'payment-receipts'")).total, 0);
      assert.equal((await scalar("select count(*)::int as total from storage.objects where bucket_id = 'raffle-media'")).total, 1);
    });
    await asUser('authenticated', alice, async () => {
      assert.equal((await scalar("select count(*)::int as total from storage.objects where bucket_id = 'payment-receipts'")).total, 1);
      await db.query("insert into storage.objects (bucket_id, name) values ('payment-receipts', $1)", [alice + '/new.png']);
      await assert.rejects(db.query("insert into storage.objects (bucket_id, name) values ('payment-receipts', $1)", [bob + '/fake.png']), /row-level security/);
      await assert.rejects(db.query("insert into storage.objects (bucket_id, name) values ('raffle-media', 'fake.png')"), /row-level security/);
    });
    await asUser('authenticated', admin, async () => {
      assert.equal((await scalar("select count(*)::int as total from storage.objects where bucket_id = 'payment-receipts'")).total, 3);
      await db.query("insert into storage.objects (bucket_id, name) values ('raffle-media', 'admin.png')");
    });
  });

  await t.test('actualizar el esquema conserva datos existentes', async () => {
    const before = await scalar('select count(*)::int as total from public.tickets');
    // Cuenta creada antes de instalar el trigger: la actualización recupera su perfil.
    await db.exec('drop trigger on_auth_user_created on auth.users');
    const existingUser = crypto.randomUUID();
    await db.query("insert into auth.users (id, email, raw_user_meta_data) values ($1, 'preexisting@example.com', '{}')", [existingUser]);
    await db.exec(schema);
    for (const sql of files.slice(1)) await db.exec(sql);
    assert.deepEqual(await scalar('select count(*)::int as total from public.tickets'), before);
    assert.equal((await scalar('select role from public.users where id = $1', [existingUser])).role, 'client');
  });
});
