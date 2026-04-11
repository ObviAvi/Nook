export const serviceCategories = [
  {
    id: 'groceries',
    label: 'Groceries',
    shortLabel: 'Grocery',
    color: '#63d2a7',
    description: 'Supermarkets, grocery stores, and convenience markets.',
  },
  {
    id: 'parks',
    label: 'Parks',
    shortLabel: 'Park',
    color: '#81c95a',
    description: 'Public parks and green space nearby.',
  },
  {
    id: 'gyms',
    label: 'Gyms',
    shortLabel: 'Gym',
    color: '#ff8a65',
    description: 'Fitness centers and gyms.',
  },
  {
    id: 'cafes',
    label: 'Cafes',
    shortLabel: 'Cafe',
    color: '#f5c36b',
    description: 'Coffee shops and quick sit-down spots.',
  },
]

export const defaultServiceCategoryIds = ['groceries', 'parks', 'gyms']

export const serviceCategoryMap = Object.fromEntries(
  serviceCategories.map((category) => [category.id, category]),
)
