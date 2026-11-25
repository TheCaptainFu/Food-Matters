import type { Recipe } from './types'

// Health conditions that change what you should eat. Like the diet rules,
// these work on ingredient NAMES (and, for ready food with no ingredients,
// on the food's own name), compared lowercase and without Greek accents.
// This is a guide for the planner, not medical advice.

export type HealthCondition = 'cholesterol' | 'diabetes' | 'hypertension' | 'celiac' | 'lactose'

export const HEALTH_CONDITIONS: { value: HealthCondition; label: string; hint: string }[] = [
  {
    value: 'cholesterol',
    label: 'Χοληστερίνη',
    hint: 'Χωρίς αλλαντικά, βούτυρο, κρέμα γάλακτος και λιπαρά τυριά.',
  },
  {
    value: 'diabetes',
    label: 'Ζάχαρο (διαβήτης)',
    hint: 'Χωρίς ζάχαρη, μέλι, γλυκά, χυμούς και αναψυκτικά.',
  },
  {
    value: 'hypertension',
    label: 'Πίεση (υπέρταση)',
    hint: 'Χωρίς αλλαντικά, ελιές, κάπαρη, σάλτσα σόγιας, κύβους και τουρσιά.',
  },
  {
    value: 'celiac',
    label: 'Κοιλιοκάκη (γλουτένη)',
    hint: 'Χωρίς αλεύρι, ψωμί, ζυμαρικά, πίτες, φρυγανιά και βρώμη.',
  },
  {
    value: 'lactose',
    label: 'Δυσανεξία στη λακτόζη',
    hint: 'Χωρίς γάλα, γιαούρτι, κρέμα γάλακτος και μαλακά τυριά.',
  },
]

type Rule = {
  // Any of these in a name means the food doesn't suit the condition…
  avoid: string[]
  // …unless the name also has one of these ("χωρίς ζάχαρη", "zero").
  except?: string[]
  // Whole kinds of food that never suit it (e.g. sweets for diabetes).
  categories?: Recipe['category'][]
}

const PROCESSED_MEAT = ['μπεικον', 'λουκανικ', 'σαλαμ', 'ζαμπον', 'παστουρμ', 'σουτζουκ', 'πανσετ', 'καβουρμ', 'μορταδελ', 'προσουτ', 'καπνιστ']

const RULES: Record<HealthCondition, Rule> = {
  cholesterol: {
    avoid: [
      ...PROCESSED_MEAT,
      'βουτυρ',
      'κρεμα γαλακτ',
      'συκωτ',
      'μυαλ',
      'λαρδ',
      'κεφαλοτυρ',
      'μασκαρπον',
      'παγωτ',
      'σφολιατ',
      'γυρο',
      'κρουασαν',
      'μπουγατσ',
      'λουκουμαδ',
    ],
    except: ['φυστικοβουτυρ'],
  },
  diabetes: {
    avoid: [
      'ζαχαρ',
      'μελι',
      'μαρμελαδ',
      'σιροπ',
      'σοκολατ',
      'πραλιν',
      'nutella',
      'μερεντ',
      'χυμ',
      'αναψυκτ',
      'πορτοκαλαδ',
      'λεμοναδ',
      'παγωτ',
      'λουκουμ',
      'χαλβ',
      'μπισκοτ',
      'κεικ',
      'τουρτ',
      'κρουασαν',
      'μπουγατσ',
      'βαφλ',
      'κορν φλεικ',
      // coffee "μέτριος" / "γλυκός" = with sugar
      'μετριος',
      'γλυκος',
    ],
    except: ['μελιτζαν', 'χωρις ζαχαρ', 'zero', 'light'],
    categories: ['dessert', 'sweets'],
  },
  hypertension: {
    avoid: [...PROCESSED_MEAT, 'αντζουγ', 'καπαρ', 'ελιες', 'σαλτσα σογιας', 'κυβος', 'τουρσι', 'παστο', 'πατατακ', 'κρακερ'],
  },
  celiac: {
    avoid: [
      'αλευρ',
      'ψωμ',
      'φρυγαν',
      'ζυμαρικ',
      'μακαρον',
      'σπαγγετ',
      'πεννε',
      'κριθαρ',
      'χυλοπιτ',
      'τραχαν',
      'κουσκους',
      'πλιγουρ',
      'βρωμ',
      'φυλλο',
      'σφολιατ',
      'πιτα',
      'πιτες',
      'παξιμαδ',
      'τορτιγ',
      'μπυρ',
      'σιμιγδαλ',
      'λαζαν',
      'νιοκ',
      'ταλιατελ',
      'φιδε',
      'μπισκοτ',
      'κρουασαν',
      'μπουγατσ',
      'κουλουρ',
      'τοστ',
      'σαντουιτς',
      'πιτσα',
      'burger',
      'κρεπ',
      'βαφλ',
      'κορν φλεικ',
    ],
    except: ['χωρις γλουτεν', 'καλαμποκαλευρ', 'ρυζαλευρ', 'σταφιδ', 'τυρι τοστ'],
  },
  lactose: {
    avoid: [
      'γαλα',
      'κρεμα γαλακτ',
      'γιαουρτ',
      'παγωτ',
      'μυζηθρ',
      'ανθοτυρ',
      'κοταζ',
      'cottage',
      'τυρι κρεμα',
      'μασκαρπον',
      'ρικοτ',
      'ριζογαλ',
      'γαλακτομπουρ',
      'καπουτσιν',
      'λατε',
    ],
    except: ['ροφημα', 'χωρις λακτοζ', 'γαλα βρωμης', 'γαλα αμυγδαλ', 'γαλα σογιας'],
  },
}

function plain(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

function hits(name: string, rule: Rule): boolean {
  const n = plain(name)
  if (rule.except?.some((e) => n.includes(e))) return false
  return rule.avoid.some((k) => n.includes(k))
}

export type ConditionConflict = { condition: HealthCondition; label: string; items: string[] }

// Which of your conditions a food clashes with, and because of what.
export function conditionConflicts(recipe: Recipe, conditions: HealthCondition[]): ConditionConflict[] {
  const out: ConditionConflict[] = []
  for (const condition of conditions) {
    const rule = RULES[condition]
    const label = HEALTH_CONDITIONS.find((c) => c.value === condition)?.label ?? condition
    if (rule.categories?.includes(recipe.category)) {
      out.push({ condition, label, items: [] })
      continue
    }
    // Ready food has no ingredients: its name says what it is.
    const names = recipe.ingredients.length > 0 ? recipe.ingredients.map((i) => i.name) : [recipe.title]
    const items = names.filter((name) => hits(name, rule))
    if (items.length > 0) out.push({ condition, label, items })
  }
  return out
}

export function suitsConditions(recipe: Recipe, conditions: HealthCondition[]): boolean {
  return conditions.length === 0 || conditionConflicts(recipe, conditions).length === 0
}
