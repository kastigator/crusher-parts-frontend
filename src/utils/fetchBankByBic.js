export default async function fetchBankByBic(bic) {
  const token = import.meta.env.VITE_DADATA_API_KEY

  const res = await fetch("https://suggestions.dadata.ru/suggestions/api/4_1/rs/findById/bank", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": `Token ${token}`
    },
    body: JSON.stringify({ query: bic })
  })

  const data = await res.json()
  const bank = data?.suggestions?.[0]?.data

  if (!bank) return null

  return {
    name: bank.name?.payment,
    address: bank.address?.value,
    corr_account: bank.correspondent_account,
    swift: bank.swift
  }
}
