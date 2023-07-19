import { createSlice } from '@reduxjs/toolkit'

export const directoryPath = createSlice({
    name: 'directoryPath',
    initialState: {
        value: null,
        type: null
    },
    reducers: {
        setDirectoryPath: (state, action) => {
            state.value = true,
                state.type = action.payload
        },
        resetDirectoryPath: state => {
            state.value = null,
                state.type = null
        }
    }
})

// Action creators are generated for each case reducer function
export const { setDirectoryPath, resetDirectoryPath } = directoryPath.actions

export default directoryPath.reducer