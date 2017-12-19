
"use strict";

const memory = window.localStorage || window.sessionStorage || {
	clear: function() {
		for(let v in this) {
			if(typeof v !== "function") {
				this[v] = undefined
			}
			continue
		}
		return
	},
}

function token(token) {
	if(token) {
		memory.token = token
	}
	return memory.token
}

const http = {
	handlers: {
		resp: function(resp, callback) {
			if(!resp.ok) {
				let reason = resp.statusText
				if(callback) {
					return callback(reason, resp)
				}
				return reason
			}
			return resp.json().then(function(json) {
				if(callback) {
					return callback(json)
				}
				return json
			}).catch(function(err) {
				if(err) {
					return console.log(err)
				}
				return resp.text().then(function(text) {
					if(callback) {
						return callback(text)
					}
					return text
				})
			})
		},
		head: function() {
			let result = {
				"content-type": "application/json",
			}
			if(token()) {
				result.authorization = "Token " + token()
			}
			return result
		},
	},
	get: function(resource, callback) {
		return fetch(resource, {
			headers: http.handlers.head(),
		}).then(function(resp) {
			return http.handlers.resp(resp, callback)
		})
	},
	post: function(resource, body, callback) {
		return fetch(resource, {
			headers: http.handlers.head(),
			method: "post",
			body: JSON.stringify(body),
		}).then(function(resp) {
			return http.handlers.resp(resp, callback)
		})
	},
}

const _app = {
	host: "",
	path: "api/v1",
	make: function(sub) {
		if(!sub) {
			sub = ""
		}
		if(Array.isArray(sub)) {
			sub = sub.join("/")
		}
		return [
			_app.host,
			_app.path,
			sub,
		].join("/") + "/"
	},
	login: function(mail, pass, callback) {
		return http.post(_app.make(["auth", "token"]), {
			email: mail,
			password: pass,
		}, function(data, resp) {
			token(data.token)
			memory.id = data.id
			if(callback) {
				return callback(data)
			}
			return data || resp
		})
	},
}

const _lazy = {
	images: function(node, param, callback) {
		if(!node) {
			return
		}
		if(typeof param === "function") {
			callback = param
			param = null
		}
		param = param || "img"
		node.querySelectorAll(`[data-${param}]`).forEach(function(elem) {
			elem.style.backgroundImage = `url(${elem.dataset[param]})`
			if(callback) {
				return callback(elem)
			}
			return
		})
		return
	},
	contents: function(node, param, type, callback) {
		if(!node) {
			return
		}
		if(typeof type === "function") {
			callback = type
			type = null
		}
		if(typeof param === "function") {
			callback = param
			param = null
		}
		param = param || "html"
		type = type || "document"
		node.querySelectorAll(`[data-${param}]`).forEach(function(elem) {
			fetch(elem.dataset[param]).then(function(resp) {
				if(!resp.ok) {
					return resp.statusText
				}
				return resp.text().then(function(data) {
					elem.innerHTML = data
					if(callback) {
						return callback(elem, data)
					}
					return data
				})
			})
			return
		})
		return
	},
	execute: function(elem) {
		elem.querySelectorAll("script").forEach(function(elem) {
			if(elem.src) {
				return fetch(elem.src).then(function(resp) {
					return resp.text().then(function(text) {
						return new Function(text).call(this)
					})
				})
			}
			return new Function(elem.innerHTML).call(this)
		})
		return
	},
}

function loadContent(elem) {
	return _lazy.contents(elem, function(elem, data) {
		_lazy.execute(elem)
		return _lazy.images(elem, function(elem) {
			console.log("loaded:", elem)
			return elem
		})
	})
}

window.onhashchange = function(e) {
	let hash = window.location.hash.substring(1) || null
	if(!hash) {
		return
	}
	if(hash.length > 1) {
		let parts = hash.substring(1).split(".");
		document.querySelector("main").dataset.html =
			"./pages/" + parts.shift() + ".html"
		this.parts = parts
	} else {
		this.parts = null
	}
	return loadContent(document)
}

window.onload = function(e) {
	if(window.location.hostname === "localhost") {
		fetch("api.txt").then(function(resp) {
			return resp.text()
		}).then(function(text) {
			_app.host = text
			if(!window.location.hash || window.location.hash.length < 3) {
				window.location.hash = "#!feed"
			}
			return window.onhashchange()
		})
		fetch("dbg.txt").then(function(resp) {
			if(!resp.ok) {
				throw Error(resp.statusText)
			}
			return resp.text()
		}).then(function(text) {
			return new WebSocket(text).onmessage = function(e) {
				return window.location.reload()
			}
		}).catch(console.log)
		return
	}
	if(token() && !window.location.hash || window.location.hash.length < 3) {
		window.location.hash = "#!feed"
		return
	}
	/*
	fetch("//cdnjs.cloudflare.com/ajax/libs/materialize/0.100.2/js/materialize.min.js")
		.then(function(res) {
			return res.text().then(function(text) {
				return new Function(text).call(this)
			})
		})
	*/
	return window.onhashchange(null)
}
