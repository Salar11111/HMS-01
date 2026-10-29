export type VitalReading = {
  temperature?: number | null
  heartRate?: number | null
  systolic?: number | null
  diastolic?: number | null
  respiratoryRate?: number | null
  oxygenSaturation?: number | null
}

/** Shared critical range for the nursing board and the physician alert. */
export function criticalVitalReasons(reading: VitalReading) {
  const reasons: string[] = []
  const temperature = reading.temperature == null ? null : Number(reading.temperature)

  if (reading.oxygenSaturation != null && reading.oxygenSaturation < 92) {
    reasons.push(`SpO2 ${reading.oxygenSaturation}%`)
  }
  if (reading.heartRate != null && (reading.heartRate < 40 || reading.heartRate > 130)) {
    reasons.push(`HR ${reading.heartRate}`)
  }
  if (reading.systolic != null && (reading.systolic < 90 || reading.systolic > 200)) {
    reasons.push(`BP ${reading.systolic}/${reading.diastolic ?? "?"}`)
  }
  if (temperature != null && (temperature < 35 || temperature >= 39)) {
    reasons.push(`Temp ${temperature}C`)
  }
  if (
    reading.respiratoryRate != null &&
    (reading.respiratoryRate < 8 || reading.respiratoryRate > 30)
  ) {
    reasons.push(`RR ${reading.respiratoryRate}`)
  }

  return reasons
}

export function isCriticalVital(reading: VitalReading) {
  return criticalVitalReasons(reading).length > 0
}

export function criticalVitalSummary(reading: VitalReading) {
  const reasons = criticalVitalReasons(reading)
  return reasons.length ? `Outside safe range: ${reasons.join(", ")}` : null
}
