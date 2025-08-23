import {defineField, defineType} from 'sanity'

export const customOption = defineType({
  name: 'customOption',
  title: 'Custom Option',
  type: 'object',
  fields: [
    defineField({
      name: 'name',
      title: 'Option Name',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'images',
      title: 'Option Images',
      type: 'array',
      of: [{type: 'productOptionImage'}],
    }),
  ],
})