import { Sequelize } from 'sequelize';
import { env } from '../utils/env';

const sequelize = new Sequelize(
  env('PG_DATABASE'),
  env('PG_USER'),
  env('PG_PASSWORD'),
  {
    host: env('PG_HOST'),
    port: Number(env('PG_PORT')),
    dialect: 'postgres',
    logging: false,
  }
);

export default sequelize;
