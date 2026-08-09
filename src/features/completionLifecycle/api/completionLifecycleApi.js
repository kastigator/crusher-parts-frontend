import axios from '@/api/axiosInstance'
export const getCompletionOverview=()=>axios.get('/completion-lifecycle/overview').then(({data})=>data)
export const getCompletionCase=(id)=>axios.get(`/completion-lifecycle/cases/${id}`).then(({data})=>data)
export const evaluateCompletionCase=(id)=>axios.post(`/completion-lifecycle/cases/${id}/evaluations`).then(({data})=>data)
export const closeCompletionCase=(id,payload)=>axios.post(`/completion-lifecycle/cases/${id}/close`,payload).then(({data})=>data)
export const reopenCompletionCase=(id,payload)=>axios.post(`/completion-lifecycle/cases/${id}/reopen`,payload).then(({data})=>data)
export const materializeCompletionCase=(contractCaseId)=>axios.post(`/completion-lifecycle/cases/from-contracts/${contractCaseId}`).then(({data})=>data)
