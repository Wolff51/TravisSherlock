import { createSlice } from '@reduxjs/toolkit'

export const isAuth = createSlice({
    name: 'isAuth',
    initialState: {
        value: false,
    },
    reducers: {
        changeAuthForTrue: state => {
            state.value = true
        },
        changeAuthForFalse: state => {
            state.value = false
        }
    }
})

// Action creators are generated for each case reducer function
export const { changeAuthForTrue, changeAuthForFalse } = isAuth.actions

export default isAuth.reducer