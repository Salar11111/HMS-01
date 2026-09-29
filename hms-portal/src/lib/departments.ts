export interface DepartmentDetail {
  name: string
  tagline: string
  description: string
  services: string[]
  clinicalAreas: string[]
  typicalWait: string
}

export const departmentDetails: Record<string, DepartmentDetail> = {
  cardiology: {
    name: "Cardiology",
    tagline: "Heart & vascular care",
    description:
      "Our cardiology team combines interventional cardiology, electrophysiology and non-invasive diagnostics to manage the full spectrum of cardiovascular conditions — from hypertension and cholesterol to coronary artery disease and rhythm disorders.",
    services: [
      "Consultant cardiology clinics",
      "Echocardiography and stress testing",
      "Ambulatory ECG and holter monitoring",
      "Coronary angiography and stenting",
      "Heart failure monitoring programme",
      "Cardiac rehabilitation",
    ],
    clinicalAreas: [
      "Chest pain and acute coronary syndrome",
      "Atrial fibrillation and palpitations",
      "Hypertension and lipid disorders",
      "Post-operative and post-PCI follow-up",
    ],
    typicalWait: "5–7 days for clinic review",
  },
  neurology: {
    name: "Neurology",
    tagline: "Brain & nervous system",
    description:
      "Consultants in neurology manage headache disorders, epilepsy, stroke, movement disorders and peripheral nerve conditions, supported by neurophysiology, imaging and a dedicated stroke pathway.",
    services: [
      "General neurology clinics",
      "Stroke and TIA rapid access",
      "Electroencephalography (EEG)",
      "Nerve conduction studies",
      "Multiple sclerosis service",
      "Memory and cognitive disorders clinic",
    ],
    clinicalAreas: [
      "Stroke and transient ischaemic attack",
      "Epilepsy and first seizures",
      "Migraine and cluster headache",
      "Neuropathy and neuromuscular disease",
    ],
    typicalWait: "10–14 days for clinic review",
  },
  orthopedics: {
    name: "Orthopedics",
    tagline: "Bones, joints & spine",
    description:
      "From arthroscopy and joint replacement to spinal surgery and trauma care, our orthopedic surgeons work alongside physiotherapists to restore mobility and reduce recovery time.",
    services: [
      "Joint replacement and arthroscopy",
      "Spinal surgery and pain management",
      "Sports injury clinic",
      "Paediatric orthopedics",
      "Fracture and trauma clinic",
      "Physiotherapy and rehabilitation",
    ],
    clinicalAreas: [
      "Hip and knee replacement",
      "Sports and ligament injuries",
      "Spinal stenosis and disc disease",
      "Fractures and post-traumatic care",
    ],
    typicalWait: "7–10 days for clinic review",
  },
  oncology: {
    name: "Oncology",
    tagline: "Cancer treatment & support",
    description:
      "A multidisciplinary oncology service delivering diagnosis, systemic therapy, radiotherapy coordination and holistic supportive care with a named nurse for every patient.",
    services: [
      "Medical oncology clinics",
      "Chemotherapy day unit",
      "Radiotherapy coordination",
      "Breast cancer service",
      "Cancer genetic counselling",
      "Palliative and supportive care",
    ],
    clinicalAreas: [
      "Breast and gastrointestinal cancer",
      "Lung and thoracic malignancy",
      "Urological cancer",
      "Lymphoma and haematological malignancy",
    ],
    typicalWait: "3–5 days for urgent referrals",
  },
  pediatrics: {
    name: "Pediatrics",
    tagline: "Children's health",
    description:
      "Child-centred care from newborn assessment through to adolescent health, with a same-day urgent pathway and child-friendly facilities designed with families.",
    services: [
      "Child health and development clinics",
      "Same-day urgent pediatric service",
      "Immunisation program",
      "Asthma and allergy clinics",
      "Newborn screening",
      "Adolescent health service",
    ],
    clinicalAreas: [
      "Respiratory and asthma care",
      "Developmental and behavioural concerns",
      "Eczema and food allergy",
      "Childhood injuries and sports medicine",
    ],
    typicalWait: "Same day for urgent referrals",
  },
  emergency: {
    name: "Emergency",
    tagline: "24/7 trauma center",
    description:
      "Round-the-clock emergency care with a resus bay, trauma team on call, imaging on site and a fast-track pathway for lower acuity presentations.",
    services: [
      "24/7 emergency department",
      "Resuscitation and trauma bay",
      "Fast-track minor injuries",
      "On-site imaging and pathology",
      "Stroke and cardiac alert pathways",
      "Observation and short-stay unit",
    ],
    clinicalAreas: [
      "Major trauma and resuscitation",
      "Chest pain and cardiac arrest",
      "Stroke and neurological emergency",
      "Major allergic and anaphylactic reaction",
    ],
    typicalWait: "Triage-based, immediate for resuscitation",
  },
  "womens-health": {
    name: "Women's Health",
    tagline: "OB/GYN & maternity",
    description:
      "A full continuum of women's healthcare, from antenatal care and delivery through to gynaecology, fertility and menopause services, with continuity of care throughout.",
    services: [
      "Antenatal and obstetric care",
      "Labour and delivery unit",
      "Gynaecology clinics",
      "Fertility and IVF counselling",
      "Menopause and bone health",
      "Well-women screening",
    ],
    clinicalAreas: [
      "Pregnancy and delivery care",
      "Menstrual and fertility concerns",
      "Gynaecological surgery",
      "Menopause and osteoporosis",
    ],
    typicalWait: "3–7 days for clinic review",
  },
  "mental-health": {
    name: "Mental Health",
    tagline: "Psychiatry & counseling",
    description:
      "Confidential mental health support including mood and anxiety services, crisis care, addiction support and therapy, delivered in a trauma-informed setting.",
    services: [
      "Mood and anxiety clinics",
      "Crisis and emergency assessment",
      "Psychotherapy and counselling",
      "Addiction and recovery service",
      "Eating disorders clinic",
      "Perinatal mental health",
    ],
    clinicalAreas: [
      "Depression and anxiety",
      "Crisis and suicide prevention",
      "Substance use disorders",
      "Perinatal and postnatal mental health",
    ],
    typicalWait: "48 hours for urgent referrals",
  },
}
