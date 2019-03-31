import React, { Component } from 'react'

import Image from '../../../components/Image/Image'
import './SinglePost.css'

class SinglePost extends Component {
	state = {
		title: '',
		author: '',
		date: '',
		image: '',
		content: ''
	}

	componentDidMount() {
		const postId = this.props.match.params.postId
		const query = `
		query{
			post(id: "${postId}"){
				_id
				title
				content
				creator{name}
				createdAt
				imgUrl
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
					throw new Error('Failed to fetch status')
				}
				console.log(resData)
				const data = resData.data.post
				this.setState({
					title: data.title,
					author: data.creator.name,
					image: 'http://localhost:3030/' + data.imgUrl,
					date: new Date(data.createdAt).toLocaleDateString('en-US'),
					content: data.content
				})
			})
			.catch(err => {
				console.log(err)
			})
	}

	render() {
		return (
			<section className='single-post'>
				<h1>{this.state.title}</h1>
				<h2>
					Created by {this.state.author} on {this.state.date}
				</h2>
				<div className='single-post__image'>
					<Image contain imageUrl={this.state.image} />
				</div>
				<p>{this.state.content}</p>
			</section>
		)
	}
}

export default SinglePost
