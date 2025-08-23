import {defineField, defineType} from 'sanity'

export const productImage = defineType({
  name: 'productImage',
  title: 'Product Image',
  type: 'object',
  fields: [
    defineField({
      name: 'url',
      title: 'URL',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'alt',
      title: 'Alt Text',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
  ],
})