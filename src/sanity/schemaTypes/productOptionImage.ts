import {defineField, defineType} from 'sanity'

export const productOptionImage = defineType({
  name: 'productOptionImage',
  title: 'Product Option Image',
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
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
    }),
    defineField({
      name: 'price',
      title: 'Additional Price',
      type: 'number',
      initialValue: 0,
    }),
  ],
})