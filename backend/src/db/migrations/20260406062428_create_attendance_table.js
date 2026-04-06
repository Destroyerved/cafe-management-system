exports.up = function(knex) {
  return knex.schema.createTable('staff_attendance', (table) => {
    table.increments('id').primary();
    table.integer('staff_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
    table.timestamp('clock_in').defaultTo(knex.fn.now());
    table.timestamp('clock_out').nullable();
    table.decimal('hours_worked', 5, 2).nullable();
    table.string('status').defaultTo('clocked_in'); // 'clocked_in' or 'clocked_out'
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('staff_attendance');
};
