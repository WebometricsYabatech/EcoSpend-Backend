import prisma from '../lib/prisma.js'

const defaultCategories = [
  'Groceries',
  'Food & Dining',
  'Transport',
  'Utilities',
  'Clothing',
  'Electronics',
  'Health',
  'Entertainment',
  'Other'
]

// GET all categories for user
export const getCategories = async (req, res) => {
  try {
    const userCategories = await prisma.category.findMany({
      where: { userId: req.user.id },
      orderBy: { name: 'asc' }
    })

    return res.status(200).json({
      defaultCategories,
      customCategories: userCategories,
      allCategories: [
        ...defaultCategories,
        ...userCategories.map(c => c.name)
      ]
    })
  } catch (error) {
    console.error('GET CATEGORIES ERROR:', error)
    return res.status(500).json({ message: 'Server Error', error: error.message })
  }
}

// CREATE custom category
export const createCategory = async (req, res) => {
  try {
    const { name } = req.body

    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'Category name is required' })
    }

    // Check if already exists for this user
    const existing = await prisma.category.findFirst({
      where: { userId: req.user.id, name: name.trim() }
    })

    if (existing) {
      return res.status(409).json({ message: 'Category already exists' })
    }

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        userId: req.user.id
      }
    })

    return res.status(201).json({
      message: 'Category created successfully',
      category
    })
  } catch (error) {
    console.error('CREATE CATEGORY ERROR:', error)
    return res.status(500).json({ message: 'Server Error', error: error.message })
  }
}

// DELETE custom category
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params

    const category = await prisma.category.findUnique({ where: { id } })

    if (!category) {
      return res.status(404).json({ message: 'Category not found' })
    }

    if (category.userId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' })
    }

    await prisma.category.delete({ where: { id } })

    return res.status(200).json({ message: 'Category deleted successfully' })
  } catch (error) {
    console.error('DELETE CATEGORY ERROR:', error)
    return res.status(500).json({ message: 'Server Error', error: error.message })
  }
}