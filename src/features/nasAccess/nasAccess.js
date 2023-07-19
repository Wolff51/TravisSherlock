import { createSlice } from '@reduxjs/toolkit'

export const nasAccess = createSlice({
    name: 'nasAccess',
    initialState: {
        value: false,
        path: '',
    },
    reducers: {
        setNasDirectoryPath: (state, action) => {
            state.value = true,
                state.path = action.payload
        },
        setNasAccessFalse: state => {
            state.value = false,
                state.path = ''
        }
    }
})

// Action creators are generated for each case reducer function
export const { setNasDirectoryPath, setNasAccessFalse } = nasAccess.actions

export default nasAccess.reducer