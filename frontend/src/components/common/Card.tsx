import React from 'react'

type CardProps = React.HTMLAttributes<HTMLDivElement>

const Card = ({ children, className = '', ...rest }: CardProps) => {
  return (
    <div
      className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ring-neutral-200/60 ${className}`.trim()}
      {...rest}
    >
      {children}
    </div>
  )
}

export default Card
