exports.up = function(knex) {
  return knex.schema.alterTable('products', (t) => {
    t.text('image_url').nullable();
  });
};
exports.down = function(knex) {
  return knex.schema.alterTable('products', (t) => {
    t.dropColumn('image_url');
  });
};
