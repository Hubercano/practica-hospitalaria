const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log('Conectando a la base de datos...');
    await prisma.$connect();

    console.log('Ejecutando truncado de todas las tablas en schema public...');
    const sql = `DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP EXECUTE 'TRUNCATE TABLE public.' || quote_ident(r.tablename) || ' RESTART IDENTITY CASCADE'; END LOOP; END $$;`;
    await prisma.$executeRawUnsafe(sql);

    console.log('Truncado completado.');
  } catch (e) {
    console.error('Error durante truncado:', e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
