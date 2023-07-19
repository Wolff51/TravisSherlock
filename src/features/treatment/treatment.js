import { createSlice } from '@reduxjs/toolkit'
const { ipcRenderer } = window.require("electron");

export const treatment = createSlice({
    name: 'treatment',
    initialState: {
        slot1: 'none',
        slot2: 'none',
        slot3: 'none'

    },
    reducers: {
        changeFirstAvailable: (state, action) => {

            if (state.slot1 === 'none') {
                state.slot1 = action.payload
            }
            else if (state.slot2 === 'none') {
                state.slot2 = action.payload
            }
            else if (state.slot3 === 'none') {
                state.slot3 = action.payload
            } else {
                ipcRenderer.send("show-message", "error", "You can't add more than 3 treatments at the same time")
            }
        },

    }
})

// Action creators are generated for each case reducer function
export const { changeForClassic, changeForNordex } = treatment.actions

export default treatment.reducer