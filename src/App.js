import React, { Component, Fragment } from 'react'
import { Route, Switch, Redirect, withRouter } from 'react-router-dom'

import Layout from './components/Layout/Layout'
import Backdrop from './components/Backdrop/Backdrop'
import Toolbar from './components/Toolbar/Toolbar'
import MainNavigation from './components/Navigation/MainNavigation/MainNavigation'
import MobileNavigation from './components/Navigation/MobileNavigation/MobileNavigation'
import ErrorHandler from './components/ErrorHandler/ErrorHandler'
import FeedPage from './pages/Feed/Feed'
import SinglePostPage from './pages/Feed/SinglePost/SinglePost'
import LoginPage from './pages/Auth/Login'
import SignupPage from './pages/Auth/Signup'
import './App.css'

class App extends Component {
	state = {
		showBackdrop: false,
		showMobileNav: false,
		isAuth: false,
		token: null,
		userId: null,
		authLoading: false,
		error: null
	}

	componentDidMount() {
		const token = localStorage.getItem('token')
		const expiryDate = localStorage.getItem('expiryDate')
		if (!token || !expiryDate) {
			return
		}
		if (new Date(expiryDate) <= new Date()) {
			this.logoutHandler()
			return
		}
		const userId = localStorage.getItem('userId')
		const remainingMilliseconds =
			new Date(expiryDate).getTime() - new Date().getTime()
		this.setState({ isAuth: true, token: token, userId: userId })
		this.setAutoLogout(remainingMilliseconds)
	}

	mobileNavHandler = isOpen => {
		this.setState({ showMobileNav: isOpen, showBackdrop: isOpen })
	}

	backdropClickHandler = () => {
		this.setState({ showBackdrop: false, showMobileNav: false, error: null })
	}

	logoutHandler = () => {
		this.setState({ isAuth: false, token: null })
		localStorage.removeItem('token')
		localStorage.removeItem('expiryDate')
		localStorage.removeItem('userId')
	}

	loginHandler = (event, authData) => {
		event.preventDefault()
		const data = authData
		this.setState({ authLoading: true })
		const query = `{
			login(email:"${data.email}", password:"${data.password}")
			{
				token 
				userId
			}
		}`
		fetch('http://localhost:3030/graphql', {
			method: 'POST',
			headers: {
				'content-type': 'application/json'
			},
			body: JSON.stringify({ query })
		})
			.then(res => {
				return res.json()
			})
			.then(resData => {
				if (resData.errors && resData.errors[0].code === 422) {
					throw new Error('Validation failed.')
				}
				if (resData.errors) {
					console.log('Error!')
					throw new Error('Could not authenticate you!')
				}

				const data = resData.data.login
				console.log(data)
				this.setState({
					isAuth: true,
					token: data.token,
					authLoading: false,
					userId: data.userId
				})
				localStorage.setItem('token', data.token)
				localStorage.setItem('userId', data.userId)
				const remainingMilliseconds = 60 * 60 * 1000
				const expiryDate = new Date(
					new Date().getTime() + remainingMilliseconds
				)
				localStorage.setItem('expiryDate', expiryDate.toISOString())
				this.setAutoLogout(remainingMilliseconds)
			})
			.catch(err => {
				console.log(err)
				this.setState({
					isAuth: false,
					authLoading: false,
					error: err
				})
			})
	}

	signupHandler = (event, authData) => {
		event.preventDefault()
		this.setState({ authLoading: true })

		const data = authData.signupForm

		const query = `mutation CreateUser($input: userInfo){
			createUser(input:$input){
				_id
				email
				name
				status
			}
		}`

		fetch('http://localhost:3030/graphql', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				query,
				variables: {
					input: {
						email: data.email.value,
						name: data.name.value,
						password: data.password.value
					}
				}
			})
		})
			.then(res => {
				return res.json()
			})
			.then(resData => {
				if (resData.errors && resData.errors[0].status === 422) {
					throw new Error(
						"Validation failed. Make sure the email address isn't used yet!"
					)
				}
				if (resData.errors) {
					throw new Error('User Creation Failed')
				}
				this.setState({ isAuth: false, authLoading: false })
				this.props.history.replace('/')
			})
			.catch(err => {
				console.log(err)
				this.setState({
					isAuth: false,
					authLoading: false,
					error: err
				})
			})
	}

	setAutoLogout = milliseconds => {
		setTimeout(() => {
			this.logoutHandler()
		}, milliseconds)
	}

	errorHandler = () => {
		this.setState({ error: null })
	}

	render() {
		let routes = (
			<Switch>
				<Route
					path='/'
					exact
					render={props => (
						<LoginPage
							{...props}
							onLogin={this.loginHandler}
							loading={this.state.authLoading}
						/>
					)}
				/>
				<Route
					path='/signup'
					exact
					render={props => (
						<SignupPage
							{...props}
							onSignup={this.signupHandler}
							loading={this.state.authLoading}
						/>
					)}
				/>
				<Redirect to='/' />
			</Switch>
		)
		if (this.state.isAuth) {
			routes = (
				<Switch>
					<Route
						path='/'
						exact
						render={props => (
							<FeedPage userId={this.state.userId} token={this.state.token} />
						)}
					/>
					<Route
						path='/:postId'
						render={props => (
							<SinglePostPage
								{...props}
								userId={this.state.userId}
								token={this.state.token}
							/>
						)}
					/>
					<Redirect to='/' />
				</Switch>
			)
		}
		return (
			<Fragment>
				{this.state.showBackdrop && (
					<Backdrop onClick={this.backdropClickHandler} />
				)}
				<ErrorHandler error={this.state.error} onHandle={this.errorHandler} />
				<Layout
					header={
						<Toolbar>
							<MainNavigation
								onOpenMobileNav={this.mobileNavHandler.bind(this, true)}
								onLogout={this.logoutHandler}
								isAuth={this.state.isAuth}
							/>
						</Toolbar>
					}
					mobileNav={
						<MobileNavigation
							open={this.state.showMobileNav}
							mobile
							onChooseItem={this.mobileNavHandler.bind(this, false)}
							onLogout={this.logoutHandler}
							isAuth={this.state.isAuth}
						/>
					}
				/>
				{routes}
			</Fragment>
		)
	}
}

export default withRouter(App)
