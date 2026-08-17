export function calculateAge(dobString: string | undefined | null): number | null {
  if (!dobString) return null
  // Date of birth is expected in YYYY-MM-DD format
  const parts = dobString.split('-')
  if (parts.length !== 3) return null
  
  const birthYear = parseInt(parts[0], 10)
  const birthMonth = parseInt(parts[1], 10) - 1 // JavaScript months are 0-indexed
  const birthDay = parseInt(parts[2], 10)
  
  if (isNaN(birthYear) || isNaN(birthMonth) || isNaN(birthDay)) return null

  const today = new Date()
  let age = today.getFullYear() - birthYear
  const m = today.getMonth() - birthMonth
  
  if (m < 0 || (m === 0 && today.getDate() < birthDay)) {
    age--
  }
  
  return age
}

export function formatDateOfBirth(dobString: string | undefined | null): string {
  if (!dobString) return 'N/A'
  const parts = dobString.split('-')
  if (parts.length !== 3) return dobString
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}
