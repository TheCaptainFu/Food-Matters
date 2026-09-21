import type { Recipe } from './types'

export const SAMPLE_RECIPES: Recipe[] = [
  {
    id: 'seed-1',
    title: 'Greek Salad',
    category: 'vegetarian',
    mealTypes: ['lunch', 'dinner', 'afternoon'],
    instructions:
      'Chop the tomato and cucumber into chunks. Combine in a bowl with the crumbled feta and olives. Drizzle with a little olive oil if you like and serve immediately.',
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
    mealTypes: ['lunch', 'dinner'],
    instructions:
      'Rub the chicken breast with olive oil and a squeeze of lemon juice. Grill or pan-sear over medium-high heat for 6-7 minutes per side until cooked through. Rest for a few minutes before slicing.',
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
    mealTypes: ['lunch', 'dinner'],
    instructions:
      'Boil the spaghetti according to package instructions. Meanwhile, brown the ground beef in a pan, then stir in the tomato sauce and simmer for 10 minutes. Toss the sauce with the drained spaghetti.',
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
    mealTypes: ['breakfast', 'afternoon'],
    instructions:
      'Whisk the eggs in a bowl. Melt the butter in a pan over medium heat, pour in the eggs, and sprinkle the cheese on top. Fold in half once the edges set and cook until the center is just firm.',
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
    mealTypes: ['breakfast', 'afternoon'],
    instructions:
      'Spoon the Greek yogurt into a bowl. Drizzle with honey and scatter the walnuts on top. Serve straight away.',
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
    mealTypes: ['lunch', 'dinner'],
    instructions:
      'Rinse the lentils. Sauté the diced onion and carrot in a pot for a few minutes, add the lentils and enough water to cover, then simmer for 20-25 minutes until the lentils are soft. Season to taste.',
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
    mealTypes: ['lunch', 'dinner'],
    instructions:
      'Season the salmon fillet with lemon juice and chopped dill. Grill or pan-sear skin-side down for 4-5 minutes, then flip and cook 3-4 minutes more until just opaque.',
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
    mealTypes: ['lunch', 'dinner'],
    instructions:
      'Grill the chicken breast and slice it. Toss the lettuce with the shaved parmesan, top with the sliced chicken, and serve.',
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
    mealTypes: ['lunch', 'dinner'],
    instructions:
      'Heat a pan or wok over high heat. Stir-fry the broccoli and bell pepper for 4-5 minutes until crisp-tender, then add the soy sauce and toss for another minute.',
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
    mealTypes: ['breakfast'],
    instructions:
      'Whisk the flour, milk and eggs together into a smooth batter. Pour small ladles onto a hot, lightly greased pan and cook until bubbles form on top, then flip and cook the other side.',
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
    mealTypes: ['lunch', 'dinner'],
    instructions:
      'Boil the spaghetti. Meanwhile, fry the bacon until crisp. Whisk the eggs with the parmesan, then off the heat toss the hot drained pasta with the bacon and egg mixture so it turns creamy without scrambling.',
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
    mealTypes: ['lunch', 'dinner'],
    instructions:
      'Boil the pasta until al dente. Blend the basil with the olive oil and parmesan into a rough pesto. Toss the drained pasta with the pesto and serve.',
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
    mealTypes: ['lunch', 'dinner'],
    instructions:
      'Boil the pasta. In a separate pan, melt the butter, stir in the milk and cheese over low heat until smooth, then fold in the drained pasta.',
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
    mealTypes: ['lunch', 'dinner'],
    instructions:
      'Boil the pasta. Sauté the zucchini and bell pepper in the olive oil until tender, then toss with the drained pasta.',
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
    mealTypes: ['lunch', 'dinner'],
    instructions:
      'Boil the spaghetti. Sauté the garlic in olive oil for a minute, add the shrimp and cook until pink, then toss everything with the drained pasta.',
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
    mealTypes: ['lunch', 'dinner'],
    instructions:
      'Boil the pasta sheets until pliable. Brown the ground beef and mix with the tomato sauce. Layer pasta, meat sauce and cheese in a dish, then bake at 190°C for about 25 minutes until bubbling.',
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
    mealTypes: ['lunch', 'afternoon'],
    instructions:
      'Boil the pasta and let it cool. Toss with the chopped tomato, cucumber and crumbled feta cheese, then chill briefly before serving.',
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
    mealTypes: ['lunch', 'dinner'],
    instructions:
      'Boil the pasta. Warm the tomato sauce with the flaked tuna, then toss with the drained pasta.',
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
    mealTypes: ['lunch', 'dinner'],
    instructions:
      'Boil the pasta. Sauté the sliced mushrooms until golden, stir in the heavy cream and parmesan, simmer briefly, then toss with the drained pasta.',
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
    mealTypes: ['lunch', 'dinner'],
    instructions:
      'Boil the pasta. Cook the chicken breast until browned and cooked through, then set aside. Warm the heavy cream with the parmesan into a sauce, slice the chicken back in, and toss with the drained pasta.',
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
    mealTypes: ['dinner'],
    instructions:
      'Boil or roast the potatoes until tender. Pan-sear the beef steak in butter over high heat for a few minutes per side to your liking, then rest before slicing and serving with the potatoes.',
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
    mealTypes: ['dinner'],
    instructions:
      'Rub the pork chops with garlic and olive oil. Pan-sear or grill over medium-high heat for about 5-6 minutes per side until cooked through.',
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
    mealTypes: ['lunch', 'dinner', 'afternoon'],
    instructions:
      'Toss the chicken wings with half the BBQ sauce. Bake at 200°C for about 30-35 minutes, turning halfway, then toss with the remaining sauce before serving.',
    ingredients: [
      { name: 'Chicken Wings', amount: 300, unit: 'g' },
      { name: 'BBQ Sauce', amount: 50, unit: 'g' },
    ],
  },
  {
    id: 'seed-24',
    title: 'Lamb Chops',
    category: 'meat',
    mealTypes: ['dinner'],
    instructions:
      'Rub the lamb chops with garlic and oregano. Grill or pan-sear over high heat for 3-4 minutes per side for medium, then rest briefly before serving.',
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
    mealTypes: ['lunch', 'dinner'],
    instructions:
      'Mix the ground turkey with the breadcrumbs and egg, then shape into meatballs. Pan-fry or bake at 190°C, turning occasionally, until browned and cooked through, about 15-20 minutes.',
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
    mealTypes: ['lunch', 'dinner'],
    instructions:
      'Brown the ground beef in a pan and season to taste. Warm the tortillas, fill with the beef, and top with shredded cheese.',
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
    mealTypes: ['dinner'],
    instructions:
      'Whisk the honey and mustard together and brush over the pork tenderloin. Roast at 190°C for about 25-30 minutes, basting occasionally, until cooked through.',
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
    mealTypes: ['lunch', 'dinner'],
    instructions:
      'Slice the chicken breast, bell pepper and onion into strips. Stir-fry over high heat until the chicken is cooked through and the vegetables are tender, then serve with warm tortillas.',
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
    mealTypes: ['lunch', 'dinner'],
    instructions:
      'Slice the sausage, bell pepper and onion. Sauté together in a pan over medium-high heat until the sausage is browned and the vegetables are soft.',
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
    mealTypes: ['breakfast', 'lunch', 'afternoon'],
    instructions:
      'Layer the ham and cheese between the bread slices. Serve as is, or toast in a pan until the bread is golden and the cheese has melted.',
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
    mealTypes: ['lunch', 'dinner'],
    instructions:
      'Season the tuna steak and sear briefly in olive oil, a minute or two per side for rare to medium. Sauté the sliced zucchini in the same pan and serve alongside.',
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
    mealTypes: ['lunch', 'dinner'],
    instructions:
      'Heat a pan or wok. Stir-fry the shrimp and bell pepper over high heat for a few minutes until the shrimp turn pink, then add the soy sauce and toss.',
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
    mealTypes: ['lunch', 'dinner'],
    instructions:
      'Place the cod in a baking dish, drizzle with olive oil and lemon juice, and bake at 190°C for about 12-15 minutes until it flakes easily.',
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
    mealTypes: ['lunch', 'dinner'],
    instructions:
      'Pan-fry or grill the tilapia until cooked through, then flake it. Warm the tortillas and fill with the fish and shredded cabbage.',
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
    mealTypes: ['dinner'],
    instructions:
      'Sauté the garlic briefly in a large pot. Add the mussels and white wine, cover, and steam for 5-6 minutes until the shells open. Discard any that stay closed.',
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
    mealTypes: ['breakfast', 'lunch', 'afternoon'],
    instructions:
      'Toast the bread. Mash the sardines lightly with a squeeze of lemon juice and spread over the toast.',
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
    mealTypes: ['lunch', 'dinner'],
    instructions:
      'Grill or pan-sear the mackerel for a few minutes per side until cooked through. Toss the lettuce and tomato into a simple salad and serve alongside.',
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
    mealTypes: ['lunch', 'dinner', 'afternoon'],
    instructions:
      'Slice the squid into rings and dust with flour. Fry in hot olive oil for 1-2 minutes until golden — don\'t overcook or they\'ll turn rubbery.',
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
    mealTypes: ['lunch', 'dinner'],
    instructions:
      'Cook the rice and let it cool slightly. Cube the salmon fillet (or sear briefly if you prefer it cooked) and arrange over the rice with the sliced cucumber.',
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
    mealTypes: ['lunch', 'dinner'],
    instructions:
      'Cook the rice. Pan-sear or bake the tilapia with a squeeze of lemon until cooked through, then serve over the rice.',
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
    mealTypes: ['lunch', 'dinner'],
    instructions:
      'Sauté the diced onion until soft. Add the chickpeas and coconut milk, bring to a simmer, and cook for 10-15 minutes until slightly thickened.',
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
    mealTypes: ['lunch', 'afternoon'],
    instructions:
      'Warm the falafel through (pan-fry or bake). Spread hummus over the tortilla, add the falafel, and roll up into a wrap.',
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
    mealTypes: ['lunch', 'dinner'],
    instructions:
      'Halve the bell peppers and remove the seeds. Fill with the cooked rice mixed with tomato sauce, then bake at 190°C for about 25 minutes until the peppers are tender.',
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
    mealTypes: ['lunch', 'dinner'],
    instructions:
      'Cube the tofu and pan-fry until golden on a few sides. Add the broccoli and stir-fry until crisp-tender, then toss with the soy sauce.',
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
    mealTypes: ['lunch', 'afternoon', 'dinner'],
    instructions:
      'Slice the tomato and mozzarella. Arrange alternating slices on a plate and tuck in the basil leaves.',
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
    mealTypes: ['lunch', 'dinner'],
    instructions:
      'Chop the eggplant, zucchini and tomato into chunks. Sauté together in a pot over medium heat, covered, for about 20 minutes, stirring occasionally, until soft and stewy.',
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
    mealTypes: ['lunch', 'afternoon'],
    instructions:
      'Cook the quinoa and let it cool. Toss with the diced cucumber and crumbled feta cheese.',
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
    mealTypes: ['lunch', 'dinner'],
    instructions:
      'Sauté the sliced mushrooms until golden and set aside. Toast the rice briefly, then gradually add warm stock or water, stirring, until creamy. Stir in the mushrooms and parmesan at the end.',
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
    mealTypes: ['lunch', 'dinner'],
    instructions:
      'Cook the rice. Warm the black beans through and serve over the rice topped with sliced avocado.',
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
    mealTypes: ['lunch', 'dinner'],
    instructions:
      'Chop the carrot, celery and potato. Simmer together in a pot with enough water or stock to cover, for about 20 minutes until the vegetables are tender.',
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
    mealTypes: ['breakfast', 'afternoon'],
    instructions:
      'Chop the apple and banana, and halve the grapes. Toss everything together in a bowl.',
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
    mealTypes: ['afternoon', 'dinner'],
    instructions:
      'Melt the dark chocolate gently. Whip the cream, separate the eggs, and fold the yolks into the melted chocolate, then fold in the whipped cream. Chill for at least an hour before serving.',
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
    mealTypes: ['breakfast', 'afternoon'],
    instructions:
      'Mash the banana. Mix with the flour, sugar and remaining wet ingredients into a batter, pour into a loaf tin, and bake at 180°C for about 45-50 minutes until a skewer comes out clean.',
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
    mealTypes: ['afternoon', 'dinner'],
    instructions:
      'Slice the apples and toss with a little sugar. Make a simple butter-and-flour pastry, line a dish, fill with the apples, top with more pastry, and bake at 190°C for about 35-40 minutes until golden.',
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
    mealTypes: ['afternoon', 'dinner'],
    instructions:
      'Combine the rice, milk and sugar in a pot. Simmer gently, stirring often, for about 25-30 minutes until thickened and creamy.',
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
    mealTypes: ['breakfast', 'afternoon'],
    instructions:
      'Spoon the Greek yogurt into a bowl, drizzle with honey, and scatter the walnuts on top.',
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
    mealTypes: ['afternoon'],
    instructions:
      'Cream the butter with the sugar, mix in the flour and chopped dark chocolate. Scoop onto a tray and bake at 180°C for about 10-12 minutes until golden at the edges.',
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
    mealTypes: ['breakfast', 'afternoon'],
    instructions:
      'Blend the strawberries with the Greek yogurt until smooth. Pour into a bowl and top with the blueberries.',
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
    mealTypes: ['afternoon', 'breakfast'],
    instructions:
      'Mix the peanut butter, oats and honey into a thick mixture. Roll into small balls and chill for at least 30 minutes to firm up.',
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
    mealTypes: ['afternoon'],
    instructions:
      'Layer chopped walnuts between sheets of pastry, brushing each layer with melted butter. Bake at 180°C until golden, then pour warm honey over the top and let it soak in before serving.',
    ingredients: [
      { name: 'Walnuts', amount: 100, unit: 'g' },
      { name: 'Honey', amount: 60, unit: 'g' },
      { name: 'Flour', amount: 100, unit: 'g' },
    ],
  },
]
