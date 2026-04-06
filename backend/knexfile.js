require('dotenv').config();

module.exports = {
  development: {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'pos_cafe',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
    },
    migrations: { directory: './src/db/migrations' },
    seeds: { directory: './src/db/seeds' },
  },
  production: {
    client: 'pg',
    connection: {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    },
    migrations: { directory: './src/db/migrations' },
    seeds: { directory: './src/db/seeds' },
  },
};
