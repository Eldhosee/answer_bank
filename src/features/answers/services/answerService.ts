import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db, firebaseConfigured } from '../../../firebase/config'
import { ensureAnonymousUser } from '../../../firebase/auth'
import type { Answer, AnswerInput } from '../models/answer'

const COLLECTION = 'answers'
const LOCAL_KEY = 'nabard-answer-bank-answers'

const demoAnswers: Answer[] = [
  {
    id: 'demo-shg',
    question: '“Self-Help Groups (SHGs) have emerged as an important instrument for women’s empowerment and rural development in India.” Discuss the statement. What measures can be taken to further strengthen SHGs?',
    subject: 'ARD',
    topic: 'Rural Development',
    marks: 15,
    wordLimit: 250,
    answer: `Introduction\nSelf-Help Groups (SHGs) are voluntary associations of people, usually from similar socio-economic backgrounds, who come together to save regularly and access credit for socio-economic development. They have emerged as a powerful instrument for women’s empowerment and rural development.\n\nBody\n1. Economic Empowerment\n• Provide access to savings and institutional credit, reducing dependence on informal moneylenders.\n• Enable women to start micro-enterprises and generate sustainable livelihoods.\n• Improve financial literacy and household decision-making.\n\n2. Social Empowerment\n• Build collective voice, confidence and participation in local institutions.\n• Help address social issues such as gender discrimination and violence.\n\n3. Rural Development\n• Promote livelihood diversification, entrepreneurship and local economic activity.\n• Strengthen financial inclusion through the SHG-Bank Linkage Programme.\n\nGovernment initiatives\nDAY-NRLM has strengthened women-led institutions and livelihoods, while the SHG-Bank Linkage Programme connects groups with formal banking services.\n\nWay Forward\nSHGs can be further strengthened through better digital and financial literacy, market linkages, skill development, access to affordable credit and convergence with government schemes.\n\nConclusion\nThus, strong and sustainable SHGs can transform women from beneficiaries into active agents of inclusive rural development.`,
    isFavourite: true,
  },
  {
    id: 'demo-financial',
    question: 'Discuss the importance of financial inclusion in promoting inclusive growth in rural India.',
    subject: 'ESI',
    topic: 'Financial Inclusion',
    marks: 15,
    wordLimit: 250,
    answer: `Introduction\nFinancial inclusion means ensuring affordable and appropriate access to useful financial services for all sections of society.\n\nBody\nIt supports savings, access to formal credit, insurance and payments, thereby reducing vulnerability and supporting productive investment. In rural areas, financial inclusion can improve the resilience of small farmers, informal workers and micro-enterprises.\n\nGovernment initiatives\nPradhan Mantri Jan-Dhan Yojana, Aadhaar-enabled services, mobile banking and the expansion of banking correspondents have widened access to formal finance.\n\nChallenges\nLow financial literacy, digital exclusion, distance from banking points and irregular incomes continue to constrain effective usage.\n\nWay Forward\nThe focus should move from account opening to active usage through financial literacy, stronger last-mile delivery, suitable products and consumer protection.`,
    isFavourite: false,
  },
  {
    id: 'demo-agri',
    question: 'Agriculture remains a key sector of the Indian economy. Discuss its role and major challenges.',
    subject: 'ARD',
    topic: 'Agriculture',
    marks: 10,
    wordLimit: 150,
    answer: `Introduction\nAgriculture supports livelihoods, food security, rural demand and important value chains in India.\n\nRole\n• Provides employment and income to a large rural population.\n• Supplies raw materials to agro-based industries.\n• Contributes to food and nutritional security.\n• Supports exports and rural consumption.\n\nChallenges\nSmall and fragmented holdings, climate risks, uneven irrigation, post-harvest losses, market constraints and limited value addition affect farm incomes.\n\nWay Forward\nImproving irrigation, extension services, storage, farmer producer organisations, value addition, digital agriculture and market access can make agriculture more resilient and remunerative.`,
    isFavourite: false,
  },
]

function readLocal(): Answer[] {
  const raw = localStorage.getItem(LOCAL_KEY)
  if (!raw) return demoAnswers
  try { return JSON.parse(raw) as Answer[] } catch { return demoAnswers }
}

function writeLocal(items: Answer[]) { localStorage.setItem(LOCAL_KEY, JSON.stringify(items)) }

export async function listAnswers(): Promise<Answer[]> {
  if (!firebaseConfigured || !db) return readLocal()
  await ensureAnonymousUser()
  const snapshot = await getDocs(query(collection(db, COLLECTION), orderBy('createdAt', 'desc')))
  return snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<Answer, 'id'>) }))
}

export async function getAnswer(id: string): Promise<Answer | null> {
  const answers = await listAnswers()
  return answers.find((item) => item.id === id) ?? null
}

export async function createAnswer(input: AnswerInput) {
  if (!firebaseConfigured || !db) {
    const item: Answer = { ...input, id: crypto.randomUUID() }
    writeLocal([item, ...readLocal()])
    return item.id
  }
  await ensureAnonymousUser()
  const ref = await addDoc(collection(db, COLLECTION), { ...input, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
  return ref.id
}

export async function updateAnswer(id: string, input: AnswerInput) {
  if (!firebaseConfigured || !db) {
    writeLocal(readLocal().map((item) => item.id === id ? { ...item, ...input } : item))
    return
  }
  await ensureAnonymousUser()
  await updateDoc(doc(db, COLLECTION, id), { ...input, updatedAt: serverTimestamp() })
}

export async function deleteAnswer(id: string) {
  if (!firebaseConfigured || !db) {
    writeLocal(readLocal().filter((item) => item.id !== id))
    return
  }
  await ensureAnonymousUser()
  await deleteDoc(doc(db, COLLECTION, id))
}

export async function toggleFavourite(answer: Answer) {
  return updateAnswer(answer.id, { ...answer, isFavourite: !answer.isFavourite })
}
