import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createTestDatabase } from './helpers/database.mjs';

const [source, migration, audit] = await Promise.all([
  'SUPABASE_COMPLETO.sql', 'supabase/migrations/20261028000000_global_ticket_numbers.sql', 'VERIFICAR_BOLETOS.sql',
].map((file) => readFile(new URL('../' + file, import.meta.url), 'utf8')));
const schema = source.replace('create extension if not exists "pgcrypto";', '');

test('Unicidad global de números de boleto en PostgreSQL', async (t) => {
  const db = await createTestDatabase();
  t.after(() => db.close());
  await db.exec(schema);
  const alice = crypto.randomUUID();
  const bob = crypto.randomUUID();
  const admin = crypto.randomUUID();
  const raffleA = crypto.randomUUID();
  const raffleB = crypto.randomUUID();
  const hidden = crypto.randomUUID();
  const scalar = async (sql, args = []) => (await db.query(sql, args)).rows[0];
  async function asUser(id, work, role = 'authenticated') {
    await db.exec('set role ' + role);
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id || '']);
    try { return await work(); }
    finally {
      await db.exec('reset role');
      await db.query("select set_config('request.jwt.claim.sub', '', false)");
    }
  }
  const checkout = (raffle, numbers, { user = alice, bonus = [], amount = (numbers.length - bonus.length) * 10 } = {}) =>
    scalar(`select public.submit_payment_report($1::uuid, $2::text[], $3::text[], $4::numeric,
      'Banco de prueba', $5, 'Comprador', '12345678', 'test@example.com', null, $6) as report`,
    [raffle, numbers, bonus, amount, crypto.randomUUID(), user + '/receipt.pdf']);
  const activeCount = (number) => scalar(`select count(*)::int as total from public.tickets
    where ticket_number::bigint = $1 and status in ('pending_payment', 'confirmed', 'winner')`, [number]);

  await db.query(`insert into auth.users (id, email) values
    ($1, 'alice@example.com'), ($2, 'bob@example.com'), ($3, 'admin@example.com')`, [alice, bob, admin]);
  await db.query("update public.users set role = 'admin' where id = $1", [admin]);
  await db.query(`insert into public.raffles (id, title, ticket_price, total_tickets, status,
    has_bonus_promotion, bonus_buy_threshold, bonus_free_tickets) values
    ($1, 'Rifa A', 10, 100, 'active', true, 2, 1),
    ($2, 'Rifa B', 10, 100, 'active', true, 2, 1),
    ($3, 'Borrador', 10, 100, 'draft', false, null, null)`, [raffleA, raffleB, hidden]);
  await db.exec("insert into public.bank_accounts (bank_name, account_number) values ('Banco de prueba', '123')");
  await db.query(`insert into storage.objects (bucket_id, name) values
    ('payment-receipts', $1), ('payment-receipts', $2)`, [alice + '/receipt.pdf', bob + '/receipt.pdf']);

  await t.test('dos compradores de rifas distintas no pueden reservar el mismo número', async () => {
    await asUser(alice, () => checkout(raffleA, ['1']));
    const before = await scalar('select count(*)::int as total from public.payment_reports');
    await assert.rejects(asUser(bob, () => checkout(raffleB, ['00001'], { user: bob })), /reservado/);
    assert.equal((await activeCount(1)).total, 1);
    assert.deepEqual(await scalar('select count(*)::int as total from public.payment_reports'), before);
  });

  await t.test('el índice protege también los INSERT directos y los distintos ceros iniciales', async () => {
    await assert.rejects(db.query(`insert into public.tickets (raffle_id, user_id, ticket_number, price_paid)
      values ($1, $2, '0000001', 10)`, [raffleB, bob]), { code: '23505' });
    assert.equal((await activeCount(1)).total, 1);
  });

  await t.test('el trigger no permite asignaciones directas con números inválidos', async () => {
    for (const number of ['0', '-1', '1.0', 'abc', '2147483648', null]) {
      await assert.rejects(db.query(`insert into public.tickets (raffle_id, user_id, ticket_number, price_paid)
        values ($1, $2, $3, 10)`, [raffleB, bob, number]), /Número de boleto inválido/);
    }
  });

  await t.test('respeta los números antiguos de cuatro dígitos aunque cambie el tamaño de la rifa', async () => {
    await db.exec('alter table public.tickets disable trigger trg_normalize_ticket_number');
    await db.query(`insert into public.tickets (raffle_id, user_id, ticket_number, status, price_paid)
      values ($1, $2, '0002', 'confirmed', 10)`, [raffleA, alice]);
    await db.exec('alter table public.tickets enable trigger trg_normalize_ticket_number');
    await db.query('update public.raffles set total_tickets = 100000 where id = $1', [raffleA]);
    await assert.rejects(asUser(bob, () => checkout(raffleB, ['000002'], { user: bob })), /reservado/);
    assert.equal((await activeCount(2)).total, 1);
    assert.equal((await scalar('select ticket_number from public.tickets where ticket_number::bigint = 2')).ticket_number, '0002');
  });

  await t.test('rechaza números repetidos dentro del pedido y en los regalos', async () => {
    await assert.rejects(asUser(alice, () => checkout(raffleA, ['3', '00003'])), /repetidos/);
    await assert.rejects(asUser(alice, () => checkout(raffleA, ['3', '4', '00004'], { bonus: ['00004'] })), /repetidos/);
    assert.equal((await activeCount(3)).total, 0);
    assert.equal((await activeCount(4)).total, 0);
  });

  await t.test('un conflicto global revierte el pago y los otros boletos del pedido', async () => {
    const before = await scalar('select count(*)::int as total from public.payment_reports');
    await assert.rejects(asUser(bob, () => checkout(raffleB, ['4', '0001'], { user: bob })), /reservado/);
    assert.equal((await activeCount(4)).total, 0);
    assert.deepEqual(await scalar('select count(*)::int as total from public.payment_reports'), before);
  });

  await t.test('los boletos promocionales también son únicos entre rifas', async () => {
    await asUser(alice, () => checkout(raffleA, ['10', '11', '12'], { bonus: ['12'] }));
    await assert.rejects(asUser(bob, () => checkout(raffleB, ['00012'], { user: bob })), /reservado/);
    assert.equal((await activeCount(12)).total, 1);
    assert.equal((await scalar('select is_bonus_ticket from public.tickets where ticket_number::bigint = 12')).is_bonus_ticket, true);
  });

  await t.test('un pago rechazado libera el número para otra rifa sin permitir dos boletos activos', async () => {
    const rejected = (await asUser(alice, () => checkout(raffleA, ['20']))).report;
    await asUser(admin, () => db.query('select public.review_payment_report($1, false)', [rejected.id]));
    await asUser(bob, () => checkout(raffleB, ['00020'], { user: bob }));
    assert.equal((await activeCount(20)).total, 1);
    assert.equal((await scalar("select count(*)::int as total from public.tickets where ticket_number::bigint = 20 and status = 'cancelled'")).total, 1);
    await assert.rejects(db.query("update public.tickets set status = 'confirmed' where payment_report_id = $1", [rejected.id]), { code: '23505' });
  });

  await t.test('un ganador sigue bloqueando su número y un reembolso lo libera', async () => {
    await asUser(alice, () => checkout(raffleA, ['30', '31']));
    await db.exec("update public.tickets set status = 'winner' where ticket_number::bigint = 30");
    await assert.rejects(asUser(bob, () => checkout(raffleB, ['30'], { user: bob })), /reservado/);
    await db.exec("update public.tickets set status = 'refunded' where ticket_number::bigint = 31");
    await asUser(bob, () => checkout(raffleB, ['00031'], { user: bob }));
    assert.equal((await activeCount(31)).total, 1);
  });

  await t.test('el cupo limita la cantidad vendida, no el valor del número global', async () => {
    const limited = crypto.randomUUID();
    await db.query(`insert into public.raffles (id, title, ticket_price, total_tickets, status, allow_sales_beyond_limit)
      values ($1, 'Solo dos boletos', 10, 2, 'active', false)`, [limited]);
    const first = (await asUser(alice, () => checkout(limited, ['100000']))).report;
    await assert.rejects(asUser(alice, () => checkout(limited, ['100001', '100002'])), /suficientes boletos/);
    await asUser(alice, () => checkout(limited, ['100001']));
    await assert.rejects(asUser(alice, () => checkout(limited, ['100002'])), /suficientes boletos/);
    await asUser(admin, () => db.query('select public.review_payment_report($1, false)', [first.id]));
    await asUser(bob, () => checkout(limited, ['100003'], { user: bob }));
    assert.equal((await scalar(`select count(*)::int as total from public.tickets where raffle_id = $1
      and status in ('pending_payment', 'confirmed', 'winner')`, [limited])).total, 2);
  });

  await t.test('la disponibilidad pública bloquea los números de otras rifas sin exponer compradores', async () => {
    await asUser(null, async () => {
      const { data } = await scalar('select public.get_ticket_number_availability($1) as data', [raffleA]);
      assert.deepEqual(Object.keys(data).sort(), ['minimumDigits', 'numbers', 'remainingTickets', 'scope']);
      assert.equal(data.scope, 'platform');
      assert.equal(data.minimumDigits, 5);
      assert.ok(data.numbers.includes('00020'));
      assert.ok(data.numbers.every((number) => typeof number === 'string'));
      assert.equal((await scalar('select public.get_ticket_number_availability($1) as data', [hidden])).data, null);
      assert.deepEqual((await scalar('select public.get_taken_ticket_numbers($1) as data', [hidden])).data, []);
    }, 'anon');
  });

  await t.test('veinte solicitudes del mismo número dejan exactamente un boleto y un pago', async () => {
    const before = (await scalar('select count(*)::int as total from public.payment_reports')).total;
    // PGlite encola las consultas en una conexión; comprueba que el índice y el
    // rollback siguen siendo la autoridad aunque lleguen varias solicitudes juntas.
    const results = await asUser(alice, () => Promise.allSettled(Array.from({ length: 20 }, (_, index) =>
      checkout(index % 2 ? raffleA : raffleB, ['500']))));
    assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
    assert.equal(results.filter((result) => result.status === 'rejected').length, 19);
    assert.equal((await activeCount(500)).total, 1);
    assert.equal((await scalar('select count(*)::int as total from public.payment_reports')).total, before + 1);
  });

  await t.test('la migración se puede repetir sin renumerar ni borrar boletos', async () => {
    const before = (await db.query('select * from public.tickets order by id')).rows;
    await db.exec(migration);
    await db.exec(migration);
    assert.deepEqual((await db.query('select * from public.tickets order by id')).rows, before);
  });

  await t.test('la migración detecta duplicados antiguos y revierte sin modificar los datos', async () => {
    await db.exec(`drop index public.uq_tickets_number_active_global;
      create unique index uq_tickets_raffle_number_active on public.tickets (raffle_id, ticket_number)
      where status in ('pending_payment', 'confirmed', 'winner');`);
    const duplicate = (await scalar(`insert into public.tickets (raffle_id, user_id, ticket_number, price_paid)
      values ($1, $2, '1', 10) returning id`, [raffleB, bob])).id;
    const results = await db.exec(audit);
    assert.equal(Number(results[0].rows.find((row) => Number(row.numero_repetido) === 1).cantidad), 2);
    await assert.rejects(db.exec(migration), /Ya existen números de boleto repetidos/);
    await db.exec('rollback');
    assert.equal((await activeCount(1)).total, 2);
    assert.equal((await scalar("select count(*)::int as total from pg_indexes where indexname = 'uq_tickets_raffle_number_active'")).total, 1);
    await db.query('delete from public.tickets where id = $1', [duplicate]);
    await db.exec(migration);
    assert.equal((await activeCount(1)).total, 1);
  });
});
