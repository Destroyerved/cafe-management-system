const { z } = require('zod');

const createProductSchema = z.object({
  name: z.string().min(1, 'Product name required'),
  category_id: z.coerce.number().int().positive().optional().nullable(),
  price: z.coerce.number().positive('Price must be positive'),
  tax_percent: z.coerce.number().min(0).max(100).default(0),
  unit_of_measure: z.string().default('Unit'),
  description: z.string().optional().nullable(),
  image_url: z.string().optional().nullable(),
});
const updateProductSchema = createProductSchema.partial();

const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name required'),
  color: z.string().default('#6366f1'),
  sequence: z.number().int().optional(),
});

const createOrderSchema = z.object({
  session_id: z.coerce.number().int().positive('Session ID must be a positive integer'),
  table_id: z.coerce.number().int().positive().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const addOrderLineSchema = z.object({
  product_id: z.coerce.number().int().positive('Product ID required'),
  variant_id: z.coerce.number().int().positive().optional().nullable(),
  quantity: z.coerce.number().positive('Quantity must be positive').default(1),
  notes: z.string().optional().nullable(),
});

const updateOrderLineSchema = z.object({
  quantity: z.coerce.number().positive('Quantity must be positive'),
});

const createPaymentSchema = z.object({
  order_id: z.coerce.number().int().positive('Order ID required'),
  method: z.enum(['cash', 'digital', 'upi'], { errorMap: () => ({ message: 'Method must be cash, digital or upi' }) }),
  amount: z.coerce.number().positive('Amount must be positive'),
  reference: z.string().optional().nullable(),
});

const createCustomerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email').optional().nullable().or(z.literal('')),
  phone: z.string().optional().nullable(),
  street1: z.string().optional().nullable(),
  street2: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  country: z.string().default('India'),
});

const createFloorSchema = z.object({
  name: z.string().min(1, 'Floor name required'),
  pos_config_id: z.coerce.number().int().positive('POS config required'),
  sequence: z.number().int().optional(),
});

const createTableSchema = z.object({
  floor_id: z.coerce.number().int().positive('Floor ID required'),
  table_number: z.string().min(1, 'Table number required'),
  seats: z.coerce.number().int().positive().default(4),
});

const openSessionSchema = z.object({
  pos_config_id: z.coerce.number().int().positive('POS config required'),
  opening_cash: z.coerce.number().min(0).default(0),
});

const closeSessionSchema = z.object({
  closing_cash: z.coerce.number().min(0).default(0),
});

const updateTicketStatusSchema = z.object({
  status: z.enum(['to_cook', 'preparing', 'completed']),
});

const updatePosConfigSchema = z.object({
  enable_cash: z.boolean().optional(),
  enable_digital: z.boolean().optional(),
  enable_upi: z.boolean().optional(),
  upi_id: z.string().optional().nullable(),
});

const staffPaymentSchema = z.object({
  staff_id: z.coerce.number().int().positive('Staff ID required'),
  session_id: z.coerce.number().int().positive().optional().nullable(),
  amount: z.coerce.number().positive('Amount must be positive'),
  note: z.string().optional().nullable(),
});

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  status: z.string().optional(),
  category_id: z.coerce.number().int().positive().optional(),
  is_active: z.string().optional(),
  session_id: z.coerce.number().int().positive().optional(),
  floor_id: z.coerce.number().int().positive().optional(),
  staff_id: z.coerce.number().int().positive().optional(),
});

module.exports = {
  createProductSchema, updateProductSchema,
  createCategorySchema,
  createOrderSchema, addOrderLineSchema, updateOrderLineSchema,
  createPaymentSchema,
  createCustomerSchema,
  createFloorSchema,
  createTableSchema,
  openSessionSchema, closeSessionSchema,
  updateTicketStatusSchema,
  updatePosConfigSchema,
  staffPaymentSchema,
  paginationSchema,
};
