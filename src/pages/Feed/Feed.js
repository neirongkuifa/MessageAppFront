import React, { Component, Fragment } from 'react'
// import openSocket from 'socket.io-client'

import Post from '../../components/Feed/Post/Post'
import Button from '../../components/Button/Button'
import FeedEdit from '../../components/Feed/FeedEdit/FeedEdit'
import Input from '../../components/Form/Input/Input'
import Paginator from '../../components/Paginator/Paginator'
import Loader from '../../components/Loader/Loader'
import ErrorHandler from '../../components/ErrorHandler/ErrorHandler'
import './Feed.css'

class Feed extends Component {
	state = {
		isEditing: false,
		posts: [],
		totalPosts: 0,
		editPost: null,
		status: '',
		postPage: 1,
		postsLoading: true,
		editLoading: false
	}

	componentDidMount() {
		const query = `
		query{
			getStatus
		}
		`
		fetch('http://localhost:3030/graphql', {
			method: 'POST',
			body: JSON.stringify({ query }),
			headers: {
				authorization: this.props.token,
				'content-type': 'application/json'
			}
		})
			.then(res => {
				return res.json()
			})
			.then(resData => {
				if (resData.errors) {
					throw new Error('Failed to fetch user status.')
				}
				this.setState({ status: resData.data.getStatus })
			})
			.catch(this.catchError)

		this.loadPosts()

		// // WebSocket Operations
		// const socket = openSocket('http://localhost:3030')

		// socket.on('post', data => {
		// 	switch (data.action) {
		// 		case 'create':
		// 			this.addPost(data.post)
		// 			break
		// 		case 'update':
		// 			this.updatePost(data.post)
		// 			break
		// 		case 'delete':
		// 			this.loadPosts()
		// 			break
		// 		default:
		// 			console.log('No Match Action')
		// 	}
		// })
	}

	// addPost = post => {
	// 	this.setState(prev => {
	// 		const updatedPosts = [...prev.posts]
	// 		if (prev.postPage === 1) {
	// 			updatedPosts.pop()
	// 			updatedPosts.unshift(post)
	// 		}
	// 		return {
	// 			posts: updatedPosts,
	// 			totalPosts: prev.totalPosts + 1
	// 		}
	// 	})
	// }

	// updatePost = post => {
	// 	this.setState(prevState => {
	// 		const updatedPosts = [...prevState.posts]
	// 		const updatedPostIndex = updatedPosts.findIndex(p => p._id === post._id)
	// 		if (updatedPostIndex > -1) {
	// 			updatedPosts[updatedPostIndex] = post
	// 		}
	// 		return {
	// 			posts: updatedPosts
	// 		}
	// 	})
	// }

	loadPosts = direction => {
		if (direction) {
			this.setState({ postsLoading: true, posts: [] })
		}
		let page = this.state.postPage
		if (direction === 'next') {
			page++
			this.setState({ postPage: page })
		}
		if (direction === 'previous') {
			page--
			this.setState({ postPage: page })
		}

		const query = `
		query{
			posts(page: ${page}){
				totalPosts
				posts{
					_id
					title
					content
					createdAt
					imgUrl
					creator{
						name
					}
				}
			}
		}
		`
		fetch('http://localhost:3030/graphql', {
			method: 'POST',
			headers: {
				authorization: this.props.token,
				'content-type': 'application/json'
			},
			body: JSON.stringify({ query })
		})
			.then(res => {
				return res.json()
			})
			.then(resData => {
				if (resData.errors) {
					throw new Error('Failed to fetch posts.')
				}
				const data = resData.data.posts
				this.setState({
					posts: data.posts.map(post => ({
						...post,
						imagePath: post.imgUrl
					})),
					totalPosts: data.totalPosts,
					postsLoading: false
				})
			})
			.catch(this.catchError)
	}

	statusUpdateHandler = event => {
		event.preventDefault()
		const query = `
		mutation{
			updateStatus(status: "${this.state.status}")
		}
		`
		fetch('http://localhost:3030/graphql', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: this.props.token
			},
			body: JSON.stringify({
				query
			})
		})
			.then(res => {
				return res.json()
			})
			.then(resData => {
				if (resData.errors) {
					throw new Error("Can't update status!")
				}
				console.log(resData)
			})
			.catch(this.catchError)
	}

	newPostHandler = () => {
		this.setState({ isEditing: true })
	}

	startEditPostHandler = postId => {
		this.setState(prevState => {
			const loadedPost = { ...prevState.posts.find(p => p._id === postId) }

			return {
				isEditing: true,
				editPost: loadedPost
			}
		})
	}

	cancelEditHandler = () => {
		this.setState({ isEditing: false, editPost: null })
	}

	finishEditHandler = postData => {
		this.setState({
			editLoading: true
		})
		const form = new FormData()
		form.append('image', postData.image)
		if (this.state.editPost) {
			form.append('oldImage', this.state.editPost.imagePath)
		}
		fetch('http://localhost:3030/post-image', {
			method: 'PUT',
			headers: {
				authorization: this.props.token
			},
			body: form
		})
			.then(res => res.json())
			.then(data => {
				const imgUrl = data.filePath
				let query
				if (this.state.editPost) {
					query = `
					mutation UpdatePost($input: postInfo){
						updatePost(input: $input, id: "${this.state.editPost._id}"){
							_id
							title
							content
							creator{name}
							createdAt
						}
					}
					`
				} else {
					query = `
					mutation CreatePost($input: postInfo){
						createPost(input: $input){
							_id
							title
							content
							creator{name}
							createdAt
						}
					}
					`
				}
				return fetch('http://localhost:3030/graphql', {
					method: 'POST',
					body: JSON.stringify({
						query,
						variables: {
							input: {
								title: postData.title,
								imgUrl: imgUrl || this.state.editPost.imagePath,
								content: postData.content
							}
						}
					}),
					headers: {
						authorization: this.props.token,
						'content-type': 'application/json'
					}
				})
					.then(res => {
						return res.json()
					})
					.then(resData => {
						if (resData.errors) {
							throw new Error('Creating or editing a post failed!')
						}
						const data = resData.data.createPost || resData.data.updatePost
						console.log(data)

						const post = {
							_id: data._id,
							title: data.title,
							content: data.content,
							creator: data.creator.name,
							createdAt: data.createdAt,
							imagePath: data.imgUrl
						}

						this.setState(prevState => {
							let updatedPosts = [...prevState.posts]
							let updatedTotalPosts = prevState.totalPosts
							if (prevState.editPost) {
								const postIndex = prevState.posts.findIndex(
									p => p._id === prevState.editPost._id
								)
								updatedPosts[postIndex] = post
							} else {
								updatedTotalPosts += 1
								if (prevState.posts.length >= 2) {
									updatedPosts.pop()
								}
								updatedPosts.unshift(post)
							}
							return {
								posts: updatedPosts,
								isEditing: false,
								editPost: null,
								editLoading: false,
								totalPosts: updatedTotalPosts
							}
						})
					})
					.catch(err => {
						console.log(err)
						this.setState({
							isEditing: false,
							editPost: null,
							editLoading: false,
							error: err
						})
					})
			})
	}

	statusInputChangeHandler = (input, value) => {
		this.setState({ status: value })
	}

	deletePostHandler = postId => {
		console.log(postId)
		this.setState({ postsLoading: true })
		const query = `
		mutation{
			deletePost(id:"${postId}")
		}
		`
		fetch('http://localhost:3030/graphql', {
			method: 'POST',
			body: JSON.stringify({ query }),
			headers: {
				authorization: this.props.token,
				'content-type': 'application/json'
			}
		})
			.then(res => {
				return res.json()
			})
			.then(resData => {
				if (resData.errors) {
					throw new Error('Deleting a post failed!')
				}
				console.log(resData)
				this.loadPosts()
			})
			.catch(err => {
				console.log(err)
				this.setState({ postsLoading: false })
			})
	}

	errorHandler = () => {
		this.setState({ error: null })
	}

	catchError = error => {
		this.setState({ error: error })
	}

	render() {
		return (
			<Fragment>
				<ErrorHandler error={this.state.error} onHandle={this.errorHandler} />
				<FeedEdit
					editing={this.state.isEditing}
					selectedPost={this.state.editPost}
					loading={this.state.editLoading}
					onCancelEdit={this.cancelEditHandler}
					onFinishEdit={this.finishEditHandler}
				/>
				<section className='feed__status'>
					<form onSubmit={this.statusUpdateHandler}>
						<Input
							type='text'
							placeholder='Your status'
							control='input'
							onChange={this.statusInputChangeHandler}
							value={this.state.status}
						/>
						<Button mode='flat' type='submit'>
							Update
						</Button>
					</form>
				</section>
				<section className='feed__control'>
					<Button mode='raised' design='accent' onClick={this.newPostHandler}>
						New Post
					</Button>
				</section>
				<section className='feed'>
					{this.state.postsLoading && (
						<div style={{ textAlign: 'center', marginTop: '2rem' }}>
							<Loader />
						</div>
					)}
					{this.state.posts.length <= 0 && !this.state.postsLoading ? (
						<p style={{ textAlign: 'center' }}>No posts found.</p>
					) : null}
					{!this.state.postsLoading && (
						<Paginator
							onPrevious={this.loadPosts.bind(this, 'previous')}
							onNext={this.loadPosts.bind(this, 'next')}
							lastPage={Math.ceil(this.state.totalPosts / 2)}
							currentPage={this.state.postPage}>
							{this.state.posts.map(post => (
								<Post
									key={post._id}
									id={post._id}
									author={post.creator.name}
									date={new Date(post.createdAt).toLocaleDateString('en-US')}
									title={post.title}
									image={post.imageUrl}
									content={post.content}
									onStartEdit={this.startEditPostHandler.bind(this, post._id)}
									onDelete={this.deletePostHandler.bind(this, post._id)}
								/>
							))}
						</Paginator>
					)}
				</section>
			</Fragment>
		)
	}
}

export default Feed
