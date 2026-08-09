import axios from '@/api/axiosInstance'

export const getFinancialWorkspace=()=>axios.get('/financial-operations/workspace').then(({data})=>data)
export const getCompletionReadiness=()=>axios.get('/financial-operations/completion-readiness').then(({data})=>data)
export const materializeAp=(confirmationId)=>axios.post(`/financial-operations/ap/from-accepted-confirmations/${confirmationId}`).then(({data})=>data)
export const applyFinancialTrigger=(payload)=>axios.post('/financial-operations/triggers',payload).then(({data})=>data)
export const registerSupplierInvoice=(payload)=>axios.post('/financial-operations/supplier-invoices',payload).then(({data})=>data)
export const registerCreditNote=(payload)=>axios.post('/financial-operations/supplier-credit-notes',payload).then(({data})=>data)
export const createPaymentPlan=(payload)=>axios.post('/financial-operations/payment-plans',payload).then(({data})=>data)
export const registerSupplierPayment=(payload)=>axios.post('/financial-operations/supplier-payments',payload).then(({data})=>data)
export const openFinancialDispute=(payload)=>axios.post('/financial-operations/disputes',payload).then(({data})=>data)
export const materializeReceivable=(commitmentId)=>axios.post(`/financial-operations/receivables/from-contract-commitments/${commitmentId}`).then(({data})=>data)
export const registerCustomerPayment=(payload)=>axios.post('/financial-operations/customer-payments',payload).then(({data})=>data)
export const registerCustomerCreditAdjustment=(payload)=>axios.post('/financial-operations/customer-credit-adjustments',payload).then(({data})=>data)
