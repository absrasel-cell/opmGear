import {defineField, defineType} from 'sanity'

export const pricing = defineType({
  name: 'pricing',
  title: 'Pricing',
  type: 'document',
  fields: [
    defineField({
      name: 'tier',
      title: 'Pricing Tier',
      type: 'number',
      validation: (Rule) => Rule.required().min(1).max(3),
    }),
    defineField({
      name: 'quantity1',
      title: 'Price for 1-24 units',
      type: 'number',
      validation: (Rule) => Rule.required().positive(),
    }),
    defineField({
      name: 'quantity25',
      title: 'Price for 25-49 units',
      type: 'number',
      validation: (Rule) => Rule.required().positive(),
    }),
    defineField({
      name: 'quantity50',
      title: 'Price for 50-99 units',
      type: 'number',
      validation: (Rule) => Rule.required().positive(),
    }),
    defineField({
      name: 'quantity100',
      title: 'Price for 100-249 units',
      type: 'number',
      validation: (Rule) => Rule.required().positive(),
    }),
    defineField({
      name: 'quantity250',
      title: 'Price for 250-499 units',
      type: 'number',
      validation: (Rule) => Rule.required().positive(),
    }),
    defineField({
      name: 'quantity500',
      title: 'Price for 500+ units',
      type: 'number',
      validation: (Rule) => Rule.required().positive(),
    }),
  ],
})