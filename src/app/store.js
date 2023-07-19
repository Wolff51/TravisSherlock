import { configureStore } from '@reduxjs/toolkit'
import roleReducer from '../features/role/role'
import isAuthReducer from '../features/auth/auth'
import treatmentReducer from '../features/treatment/treatment'
import directoryPath from '../features/directoryPath/directoryPath'
import nasAccess from '../features/nasAccess/nasAccess'

export default configureStore({
    reducer: {
        role: roleReducer,
        isAuth: isAuthReducer,
        treatment: treatmentReducer,
        directoryPath: directoryPath,
        nasAccess: nasAccess
    }

})