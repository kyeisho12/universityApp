import React from 'react'
import { Routes, Route, Link } from 'react-router-dom'

function Home() {
	return (
		<div style={{ padding: 24 }}>
			<h1>University Career System</h1>
			<p>React frontend is set up. Start building features!</p>
		</div>
	)
}

export default function App() {
	return (
		<div>
			<nav style={{ padding: 12, borderBottom: '1px solid #ddd' }}>
				<Link to="/">Home</Link>
			</nav>
			<Routes>
				<Route path="/" element={<Home />} />
				<Route path="*" element={<div>Not Found</div>} />
			</Routes>
		</div>
	)
}
