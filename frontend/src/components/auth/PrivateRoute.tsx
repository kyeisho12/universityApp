import React from 'react'
import { Navigate } from 'react-router-dom'
import Loading from '../common/Loading'
import { useAuthContext } from '../../context/AuthContext'

type PrivateRouteProps = {
  children: JSX.Element
}

const PrivateRoute = ({ children }: PrivateRouteProps) => {
  const { user, isLoading } = useAuthContext()

  if (isLoading) return <Loading />
  return user ? children : <Navigate to="/login" replace />
}

export default PrivateRoute
