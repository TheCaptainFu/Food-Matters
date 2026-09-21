import type { Recipe } from './types'

export const SAMPLE_RECIPES: Recipe[] = [
  {
    id: 'seed-1',
    title: 'Greek Salad',
    category: 'vegetarian',
    ingredients: [
      { name: 'Tomato', amount: 200, unit: 'g' },
      { name: 'Cucumber', amount: 150, unit: 'g' },
      { name: 'Feta Cheese', amount: 100, unit: 'g' },
      { name: 'Olives', amount: 50, unit: 'g' },
    ],
  },
  {
    id: 'seed-2',
    title: 'Grilled Chicken',
    category: 'meat',
    ingredients: [
      { name: 'Chicken Breast', amount: 300, unit: 'g' },
      { name: 'Olive Oil', amount: 20, unit: 'g' },
      { name: 'Lemon', amount: 30, unit: 'g' },
    ],
  },
  {
    id: 'seed-3',
    title: 'Spaghetti Bolognese',
    category: 'pasta',
    ingredients: [
      { name: 'Spaghetti', amount: 200, unit: 'g' },
      { name: 'Ground Beef', amount: 250, unit: 'g' },
      { name: 'Tomato Sauce', amount: 150, unit: 'g' },
    ],
  },
  {
    id: 'seed-4',
    title: 'Omelette',
    category: 'vegetarian',
    ingredients: [
      { name: 'Eggs', amount: 150, unit: 'g' },
      { name: 'Cheese', amount: 50, unit: 'g' },
      { name: 'Butter', amount: 10, unit: 'g' },
    ],
  },
  {
    id: 'seed-5',
    title: 'Greek Yogurt Bowl',
    category: 'dessert',
    ingredients: [
      { name: 'Greek Yogurt', amount: 200, unit: 'g' },
      { name: 'Honey', amount: 20, unit: 'g' },
      { name: 'Walnuts', amount: 30, unit: 'g' },
    ],
  },
  {
    id: 'seed-6',
    title: 'Lentil Soup',
    category: 'vegetarian',
    ingredients: [
      { name: 'Lentils', amount: 200, unit: 'g' },
      { name: 'Carrot', amount: 100, unit: 'g' },
      { name: 'Onion', amount: 80, unit: 'g' },
    ],
  },
  {
    id: 'seed-7',
    title: 'Grilled Salmon',
    category: 'fish',
    ingredients: [
      { name: 'Salmon Fillet', amount: 250, unit: 'g' },
      { name: 'Lemon', amount: 20, unit: 'g' },
      { name: 'Dill', amount: 5, unit: 'g' },
    ],
  },
  {
    id: 'seed-8',
    title: 'Chicken Caesar Salad',
    category: 'meat',
    ingredients: [
      { name: 'Chicken Breast', amount: 200, unit: 'g' },
      { name: 'Lettuce', amount: 150, unit: 'g' },
      { name: 'Parmesan', amount: 40, unit: 'g' },
    ],
  },
  {
    id: 'seed-9',
    title: 'Vegetable Stir Fry',
    category: 'vegetarian',
    ingredients: [
      { name: 'Broccoli', amount: 150, unit: 'g' },
      { name: 'Bell Pepper', amount: 100, unit: 'g' },
      { name: 'Soy Sauce', amount: 20, unit: 'g' },
    ],
  },
  {
    id: 'seed-10',
    title: 'Pancakes',
    category: 'dessert',
    ingredients: [
      { name: 'Flour', amount: 200, unit: 'g' },
      { name: 'Milk', amount: 250, unit: 'g' },
      { name: 'Eggs', amount: 100, unit: 'g' },
    ],
  },

  // Pasta
  {
    id: 'seed-11',
    title: 'Carbonara',
    category: 'pasta',
    ingredients: [
      { name: 'Spaghetti', amount: 200, unit: 'g' },
      { name: 'Bacon', amount: 100, unit: 'g' },
      { name: 'Eggs', amount: 100, unit: 'g' },
      { name: 'Parmesan', amount: 40, unit: 'g' },
    ],
  },
  {
    id: 'seed-12',
    title: 'Pesto Pasta',
    category: 'pasta',
    ingredients: [
      { name: 'Pasta', amount: 200, unit: 'g' },
      { name: 'Basil', amount: 20, unit: 'g' },
      { name: 'Olive Oil', amount: 30, unit: 'g' },
      { name: 'Parmesan', amount: 30, unit: 'g' },
    ],
  },
  {
    id: 'seed-13',
    title: 'Mac and Cheese',
    category: 'pasta',
    ingredients: [
      { name: 'Pasta', amount: 200, unit: 'g' },
      { name: 'Cheese', amount: 150, unit: 'g' },
      { name: 'Milk', amount: 100, unit: 'g' },
      { name: 'Butter', amount: 20, unit: 'g' },
    ],
  },
  {
    id: 'seed-14',
    title: 'Pasta Primavera',
    category: 'pasta',
    ingredients: [
      { name: 'Pasta', amount: 200, unit: 'g' },
      { name: 'Zucchini', amount: 100, unit: 'g' },
      { name: 'Bell Pepper', amount: 100, unit: 'g' },
      { name: 'Olive Oil', amount: 20, unit: 'g' },
    ],
  },
  {
    id: 'seed-15',
    title: 'Shrimp Scampi',
    category: 'pasta',
    ingredients: [
      { name: 'Spaghetti', amount: 200, unit: 'g' },
      { name: 'Shrimp', amount: 200, unit: 'g' },
      { name: 'Garlic', amount: 10, unit: 'g' },
      { name: 'Olive Oil', amount: 20, unit: 'g' },
    ],
  },
  {
    id: 'seed-16',
    title: 'Lasagna',
    category: 'pasta',
    ingredients: [
      { name: 'Pasta', amount: 200, unit: 'g' },
      { name: 'Ground Beef', amount: 200, unit: 'g' },
      { name: 'Cheese', amount: 100, unit: 'g' },
      { name: 'Tomato Sauce', amount: 150, unit: 'g' },
    ],
  },
  {
    id: 'seed-17',
    title: 'Pasta Salad',
    category: 'pasta',
    ingredients: [
      { name: 'Pasta', amount: 200, unit: 'g' },
      { name: 'Tomato', amount: 100, unit: 'g' },
      { name: 'Cucumber', amount: 100, unit: 'g' },
      { name: 'Feta Cheese', amount: 80, unit: 'g' },
    ],
  },
  {
    id: 'seed-18',
    title: 'Tuna Pasta',
    category: 'pasta',
    ingredients: [
      { name: 'Pasta', amount: 200, unit: 'g' },
      { name: 'Tuna (Canned)', amount: 150, unit: 'g' },
      { name: 'Tomato Sauce', amount: 100, unit: 'g' },
    ],
  },
  {
    id: 'seed-19',
    title: 'Mushroom Pasta',
    category: 'pasta',
    ingredients: [
      { name: 'Pasta', amount: 200, unit: 'g' },
      { name: 'Mushrooms', amount: 150, unit: 'g' },
      { name: 'Heavy Cream', amount: 80, unit: 'g' },
      { name: 'Parmesan', amount: 30, unit: 'g' },
    ],
  },
  {
    id: 'seed-20',
    title: 'Chicken Alfredo',
    category: 'pasta',
    ingredients: [
      { name: 'Pasta', amount: 200, unit: 'g' },
      { name: 'Chicken Breast', amount: 200, unit: 'g' },
      { name: 'Heavy Cream', amount: 100, unit: 'g' },
      { name: 'Parmesan', amount: 40, unit: 'g' },
    ],
  },

  // Meat
  {
    id: 'seed-21',
    title: 'Beef Steak with Potatoes',
    category: 'meat',
    ingredients: [
      { name: 'Beef Steak', amount: 250, unit: 'g' },
      { name: 'Potato', amount: 200, unit: 'g' },
      { name: 'Butter', amount: 20, unit: 'g' },
    ],
  },
  {
    id: 'seed-22',
    title: 'Pork Chops',
    category: 'meat',
    ingredients: [
      { name: 'Pork Chop', amount: 250, unit: 'g' },
      { name: 'Garlic', amount: 10, unit: 'g' },
      { name: 'Olive Oil', amount: 20, unit: 'g' },
    ],
  },
  {
    id: 'seed-23',
    title: 'BBQ Chicken Wings',
    category: 'meat',
    ingredients: [
      { name: 'Chicken Wings', amount: 300, unit: 'g' },
      { name: 'BBQ Sauce', amount: 50, unit: 'g' },
    ],
  },
  {
    id: 'seed-24',
    title: 'Lamb Chops',
    category: 'meat',
    ingredients: [
      { name: 'Lamb', amount: 250, unit: 'g' },
      { name: 'Garlic', amount: 10, unit: 'g' },
      { name: 'Oregano', amount: 5, unit: 'g' },
    ],
  },
  {
    id: 'seed-25',
    title: 'Turkey Meatballs',
    category: 'meat',
    ingredients: [
      { name: 'Turkey Breast', amount: 250, unit: 'g' },
      { name: 'Breadcrumbs', amount: 50, unit: 'g' },
      { name: 'Eggs', amount: 50, unit: 'g' },
    ],
  },
  {
    id: 'seed-26',
    title: 'Beef Tacos',
    category: 'meat',
    ingredients: [
      { name: 'Ground Beef', amount: 200, unit: 'g' },
      { name: 'Tortilla', amount: 100, unit: 'g' },
      { name: 'Cheese', amount: 60, unit: 'g' },
    ],
  },
  {
    id: 'seed-27',
    title: 'Pork Tenderloin',
    category: 'meat',
    ingredients: [
      { name: 'Pork Loin', amount: 250, unit: 'g' },
      { name: 'Honey', amount: 20, unit: 'g' },
      { name: 'Mustard', amount: 15, unit: 'g' },
    ],
  },
  {
    id: 'seed-28',
    title: 'Chicken Fajitas',
    category: 'meat',
    ingredients: [
      { name: 'Chicken Breast', amount: 250, unit: 'g' },
      { name: 'Bell Pepper', amount: 150, unit: 'g' },
      { name: 'Onion', amount: 100, unit: 'g' },
    ],
  },
  {
    id: 'seed-29',
    title: 'Sausage and Peppers',
    category: 'meat',
    ingredients: [
      { name: 'Sausage', amount: 200, unit: 'g' },
      { name: 'Bell Pepper', amount: 150, unit: 'g' },
      { name: 'Onion', amount: 100, unit: 'g' },
    ],
  },
  {
    id: 'seed-30',
    title: 'Ham and Cheese Sandwich',
    category: 'meat',
    ingredients: [
      { name: 'Bread (White)', amount: 100, unit: 'g' },
      { name: 'Ham', amount: 100, unit: 'g' },
      { name: 'Cheese', amount: 50, unit: 'g' },
    ],
  },

  // Fish
  {
    id: 'seed-31',
    title: 'Tuna Steak with Vegetables',
    category: 'fish',
    ingredients: [
      { name: 'Tuna Steak', amount: 250, unit: 'g' },
      { name: 'Zucchini', amount: 100, unit: 'g' },
      { name: 'Olive Oil', amount: 20, unit: 'g' },
    ],
  },
  {
    id: 'seed-32',
    title: 'Shrimp Stir Fry',
    category: 'fish',
    ingredients: [
      { name: 'Shrimp', amount: 250, unit: 'g' },
      { name: 'Bell Pepper', amount: 100, unit: 'g' },
      { name: 'Soy Sauce', amount: 20, unit: 'g' },
    ],
  },
  {
    id: 'seed-33',
    title: 'Baked Cod',
    category: 'fish',
    ingredients: [
      { name: 'Cod', amount: 250, unit: 'g' },
      { name: 'Lemon', amount: 20, unit: 'g' },
      { name: 'Olive Oil', amount: 15, unit: 'g' },
    ],
  },
  {
    id: 'seed-34',
    title: 'Fish Tacos',
    category: 'fish',
    ingredients: [
      { name: 'Tilapia', amount: 200, unit: 'g' },
      { name: 'Tortilla', amount: 100, unit: 'g' },
      { name: 'Cabbage', amount: 80, unit: 'g' },
    ],
  },
  {
    id: 'seed-35',
    title: 'Mussels in White Wine',
    category: 'fish',
    ingredients: [
      { name: 'Mussels', amount: 300, unit: 'g' },
      { name: 'White Wine', amount: 100, unit: 'g' },
      { name: 'Garlic', amount: 10, unit: 'g' },
    ],
  },
  {
    id: 'seed-36',
    title: 'Sardines on Toast',
    category: 'fish',
    ingredients: [
      { name: 'Sardines', amount: 150, unit: 'g' },
      { name: 'Bread (White)', amount: 80, unit: 'g' },
      { name: 'Lemon', amount: 10, unit: 'g' },
    ],
  },
  {
    id: 'seed-37',
    title: 'Mackerel with Salad',
    category: 'fish',
    ingredients: [
      { name: 'Mackerel', amount: 200, unit: 'g' },
      { name: 'Lettuce', amount: 100, unit: 'g' },
      { name: 'Tomato', amount: 100, unit: 'g' },
    ],
  },
  {
    id: 'seed-38',
    title: 'Squid Rings',
    category: 'fish',
    ingredients: [
      { name: 'Squid', amount: 250, unit: 'g' },
      { name: 'Flour', amount: 50, unit: 'g' },
      { name: 'Olive Oil', amount: 30, unit: 'g' },
    ],
  },
  {
    id: 'seed-39',
    title: 'Salmon Poke Bowl',
    category: 'fish',
    ingredients: [
      { name: 'Salmon Fillet', amount: 200, unit: 'g' },
      { name: 'Rice', amount: 150, unit: 'g' },
      { name: 'Cucumber', amount: 80, unit: 'g' },
    ],
  },
  {
    id: 'seed-40',
    title: 'Tilapia with Rice',
    category: 'fish',
    ingredients: [
      { name: 'Tilapia', amount: 250, unit: 'g' },
      { name: 'Rice', amount: 150, unit: 'g' },
      { name: 'Lemon', amount: 15, unit: 'g' },
    ],
  },

  // Vegetarian
  {
    id: 'seed-41',
    title: 'Chickpea Curry',
    category: 'vegetarian',
    ingredients: [
      { name: 'Chickpeas', amount: 250, unit: 'g' },
      { name: 'Coconut Milk', amount: 150, unit: 'g' },
      { name: 'Onion', amount: 80, unit: 'g' },
    ],
  },
  {
    id: 'seed-42',
    title: 'Falafel Wrap',
    category: 'vegetarian',
    ingredients: [
      { name: 'Falafel', amount: 200, unit: 'g' },
      { name: 'Tortilla', amount: 100, unit: 'g' },
      { name: 'Hummus', amount: 50, unit: 'g' },
    ],
  },
  {
    id: 'seed-43',
    title: 'Stuffed Peppers',
    category: 'vegetarian',
    ingredients: [
      { name: 'Bell Pepper', amount: 200, unit: 'g' },
      { name: 'Rice', amount: 100, unit: 'g' },
      { name: 'Tomato Sauce', amount: 80, unit: 'g' },
    ],
  },
  {
    id: 'seed-44',
    title: 'Tofu Stir Fry',
    category: 'vegetarian',
    ingredients: [
      { name: 'Tofu', amount: 200, unit: 'g' },
      { name: 'Broccoli', amount: 150, unit: 'g' },
      { name: 'Soy Sauce', amount: 20, unit: 'g' },
    ],
  },
  {
    id: 'seed-45',
    title: 'Caprese Salad',
    category: 'vegetarian',
    ingredients: [
      { name: 'Tomato', amount: 200, unit: 'g' },
      { name: 'Mozzarella', amount: 150, unit: 'g' },
      { name: 'Basil', amount: 10, unit: 'g' },
    ],
  },
  {
    id: 'seed-46',
    title: 'Ratatouille',
    category: 'vegetarian',
    ingredients: [
      { name: 'Eggplant', amount: 150, unit: 'g' },
      { name: 'Zucchini', amount: 150, unit: 'g' },
      { name: 'Tomato', amount: 150, unit: 'g' },
    ],
  },
  {
    id: 'seed-47',
    title: 'Quinoa Salad',
    category: 'vegetarian',
    ingredients: [
      { name: 'Quinoa', amount: 150, unit: 'g' },
      { name: 'Cucumber', amount: 100, unit: 'g' },
      { name: 'Feta Cheese', amount: 60, unit: 'g' },
    ],
  },
  {
    id: 'seed-48',
    title: 'Mushroom Risotto',
    category: 'vegetarian',
    ingredients: [
      { name: 'Rice', amount: 200, unit: 'g' },
      { name: 'Mushrooms', amount: 150, unit: 'g' },
      { name: 'Parmesan', amount: 40, unit: 'g' },
    ],
  },
  {
    id: 'seed-49',
    title: 'Black Bean Bowl',
    category: 'vegetarian',
    ingredients: [
      { name: 'Black Beans', amount: 200, unit: 'g' },
      { name: 'Rice', amount: 150, unit: 'g' },
      { name: 'Avocado', amount: 80, unit: 'g' },
    ],
  },
  {
    id: 'seed-50',
    title: 'Vegetable Soup',
    category: 'vegetarian',
    ingredients: [
      { name: 'Carrot', amount: 100, unit: 'g' },
      { name: 'Celery', amount: 80, unit: 'g' },
      { name: 'Potato', amount: 100, unit: 'g' },
    ],
  },

  // Dessert
  {
    id: 'seed-51',
    title: 'Fruit Salad',
    category: 'dessert',
    ingredients: [
      { name: 'Apple', amount: 100, unit: 'g' },
      { name: 'Banana', amount: 100, unit: 'g' },
      { name: 'Grapes', amount: 100, unit: 'g' },
    ],
  },
  {
    id: 'seed-52',
    title: 'Chocolate Mousse',
    category: 'dessert',
    ingredients: [
      { name: 'Dark Chocolate', amount: 100, unit: 'g' },
      { name: 'Heavy Cream', amount: 150, unit: 'g' },
      { name: 'Eggs', amount: 50, unit: 'g' },
    ],
  },
  {
    id: 'seed-53',
    title: 'Banana Bread',
    category: 'dessert',
    ingredients: [
      { name: 'Banana', amount: 200, unit: 'g' },
      { name: 'Flour', amount: 200, unit: 'g' },
      { name: 'Sugar', amount: 80, unit: 'g' },
    ],
  },
  {
    id: 'seed-54',
    title: 'Apple Pie',
    category: 'dessert',
    ingredients: [
      { name: 'Apple', amount: 300, unit: 'g' },
      { name: 'Flour', amount: 150, unit: 'g' },
      { name: 'Butter', amount: 80, unit: 'g' },
    ],
  },
  {
    id: 'seed-55',
    title: 'Rice Pudding',
    category: 'dessert',
    ingredients: [
      { name: 'Rice', amount: 100, unit: 'g' },
      { name: 'Milk', amount: 300, unit: 'g' },
      { name: 'Sugar', amount: 50, unit: 'g' },
    ],
  },
  {
    id: 'seed-56',
    title: 'Greek Yogurt with Honey',
    category: 'dessert',
    ingredients: [
      { name: 'Greek Yogurt', amount: 200, unit: 'g' },
      { name: 'Honey', amount: 30, unit: 'g' },
      { name: 'Walnuts', amount: 20, unit: 'g' },
    ],
  },
  {
    id: 'seed-57',
    title: 'Chocolate Chip Cookies',
    category: 'dessert',
    ingredients: [
      { name: 'Flour', amount: 200, unit: 'g' },
      { name: 'Dark Chocolate', amount: 100, unit: 'g' },
      { name: 'Butter', amount: 100, unit: 'g' },
    ],
  },
  {
    id: 'seed-58',
    title: 'Berry Smoothie Bowl',
    category: 'dessert',
    ingredients: [
      { name: 'Blueberries', amount: 100, unit: 'g' },
      { name: 'Strawberries', amount: 100, unit: 'g' },
      { name: 'Greek Yogurt', amount: 150, unit: 'g' },
    ],
  },
  {
    id: 'seed-59',
    title: 'Peanut Butter Energy Balls',
    category: 'dessert',
    ingredients: [
      { name: 'Peanut Butter', amount: 100, unit: 'g' },
      { name: 'Oats', amount: 80, unit: 'g' },
      { name: 'Honey', amount: 30, unit: 'g' },
    ],
  },
  {
    id: 'seed-60',
    title: 'Baklava',
    category: 'dessert',
    ingredients: [
      { name: 'Walnuts', amount: 100, unit: 'g' },
      { name: 'Honey', amount: 60, unit: 'g' },
      { name: 'Flour', amount: 100, unit: 'g' },
    ],
  },
]
