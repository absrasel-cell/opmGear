import {defineField, defineType} from 'sanity'

export const product = defineType({
  name: 'product',
  title: 'Product',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Product Name',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'name',
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
    }),
    defineField({
      name: 'priceTier',
      title: 'Price Tier',
      type: 'string',
      options: {
        list: [
          {title: 'Tier 1', value: 'Tier 1'},
          {title: 'Tier 2', value: 'Tier 2'},
          {title: 'Tier 3', value: 'Tier 3'},
        ],
      },
      initialValue: 'Tier 1',
    }),
    defineField({
      name: 'styleInfo',
      title: 'Style Information',
      type: 'text',
    }),
    defineField({
      name: 'mainImage',
      title: 'Main Image',
      type: 'productImage',
    }),
    defineField({
      name: 'itemData',
      title: 'Item Data Images',
      type: 'array',
      of: [{type: 'productImage'}],
    }),
    defineField({
      name: 'frontColorImages',
      title: 'Front Color Images',
      type: 'array',
      of: [{type: 'productImage'}],
    }),
    defineField({
      name: 'leftColorImages',
      title: 'Left Color Images',
      type: 'array',
      of: [{type: 'productImage'}],
    }),
    defineField({
      name: 'rightColorImages',
      title: 'Right Color Images',
      type: 'array',
      of: [{type: 'productImage'}],
    }),
    defineField({
      name: 'backColorImages',
      title: 'Back Color Images',
      type: 'array',
      of: [{type: 'productImage'}],
    }),
    defineField({
      name: 'capColorImage',
      title: 'Cap Color Images',
      type: 'array',
      of: [{type: 'productImage'}],
    }),
    defineField({
      name: 'splitColorOptions',
      title: 'Split Color Options',
      type: 'array',
      of: [{type: 'productImage'}],
    }),
    defineField({
      name: 'triColorOptions',
      title: 'Tri Color Options',
      type: 'array',
      of: [{type: 'productImage'}],
    }),
    defineField({
      name: 'camoColorOption',
      title: 'Camo Color Options',
      type: 'array',
      of: [{type: 'productImage'}],
    }),
    defineField({
      name: 'customOptions',
      title: 'Custom Product Options',
      type: 'array',
      of: [{type: 'customOption'}],
    }),
    defineField({
      name: 'isActive',
      title: 'Is Active',
      type: 'boolean',
      initialValue: true,
    }),
    defineField({
      name: 'productType',
      title: 'Product Type',
      type: 'string',
      options: {
        list: [
          {title: 'Factory', value: 'factory'},
          {title: 'Resale', value: 'resale'},
        ],
      },
      initialValue: 'factory',
    }),
    defineField({
      name: 'sellingPrice',
      title: 'Selling Price',
      type: 'number',
      hidden: ({document}) => document?.productType !== 'resale',
    }),
    defineField({
      name: 'shippingSource',
      title: 'Shipping Source',
      type: 'string',
      options: {
        list: [
          {title: 'Factory', value: 'Factory'},
          {title: 'Warehouse', value: 'Warehouse'},
        ],
      },
      hidden: ({document}) => document?.productType !== 'resale',
    }),
    defineField({
      name: 'productCategory',
      title: 'Product Category',
      type: 'string',
      options: {
        list: [
          {title: 'Caps', value: 'Caps'},
          {title: 'Shirts', value: 'Shirts'},
          {title: 'Beanies', value: 'Beanies'},
          {title: 'Other', value: 'Other'},
        ],
      },
      hidden: ({document}) => document?.productType !== 'resale',
    }),
    defineField({
      name: 'customProductCategory',
      title: 'Custom Product Category',
      type: 'string',
      hidden: ({document}) => document?.productType !== 'resale' || document?.productCategory !== 'Other',
    }),
    defineField({
      name: 'qcHandler',
      title: 'QC Handler',
      type: 'string',
      options: {
        list: [
          {title: 'Factory', value: 'Factory'},
          {title: '3rd Party', value: '3rd Party'},
          {title: 'Buyer', value: 'Buyer'},
        ],
      },
      hidden: ({document}) => document?.productType !== 'resale',
    }),
    defineField({
      name: 'productReadiness',
      title: 'Product Readiness',
      type: 'array',
      of: [{type: 'string'}],
      options: {
        list: [
          {title: 'Stock/Inventory', value: 'Stock/Inventory'},
          {title: 'Customizable', value: 'Customizable'},
        ],
      },
      hidden: ({document}) => document?.productType !== 'resale',
    }),
    defineField({
      name: 'sku',
      title: 'SKU',
      type: 'string',
      hidden: ({document}) => document?.productType !== 'resale' || !document?.productReadiness?.includes('Stock/Inventory'),
    }),
    defineField({
      name: 'stockQuantity',
      title: 'Stock Quantity',
      type: 'number',
      hidden: ({document}) => document?.productType !== 'resale' || !document?.productReadiness?.includes('Stock/Inventory'),
    }),
    defineField({
      name: 'inventoryLocation',
      title: 'Inventory Location',
      type: 'string',
      hidden: ({document}) => document?.productType !== 'resale' || !document?.productReadiness?.includes('Stock/Inventory'),
    }),
    defineField({
      name: 'reorderPoint',
      title: 'Reorder Point',
      type: 'number',
      hidden: ({document}) => document?.productType !== 'resale' || !document?.productReadiness?.includes('Stock/Inventory'),
    }),
    defineField({
      name: 'createdBy',
      title: 'Created By',
      type: 'createdBy',
    }),
    defineField({
      name: 'createdAt',
      title: 'Created At',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
    }),
    defineField({
      name: 'updatedAt',
      title: 'Updated At',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
    }),
  ],
})