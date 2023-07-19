import { createSlice } from '@reduxjs/toolkit'

export const role = createSlice({
    name: 'role',
    initialState: {
        value: 'user',
        team: 'external'
    },
    reducers: {
        changeForAdmin: state => {
            state.value = 'admin'
            state.team = 'supairvision'
        },
        changeForUser: state => {
            state.value = 'user'
            state.team = 'external'
        },
        changeForManager: state => {
            state.value = 'manager'
            state.team = 'supairvision'
        },
        changeForServiceProvider: state => {
            state.value = 'serviceProvider'
            state.team = 'external'
        },
        changeForExpertNordex: state => {
            state.value = 'expertNordex'
            state.team = 'external'
        },
        changeForSavMember: state => {
            state.value = 'savMember'
            state.team = 'supairvision'
        }
    }


})

// Action creators are generated for each case reducer function
export const { changeForAdmin, changeForUser, changeForManager, changeForSavMember, changeForServiceProvider } = role.actions

export default role.reducer