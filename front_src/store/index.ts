import Vue from 'vue';
import Vuex from 'vuex';
import SpotifyAPI from '@/utils/SpotifyAPI';
import StatsManager from '@/utils/StatsManager';
import SockController from '@/sock/SockController';

Vue.use(Vuex)

let startPromise: Promise<any>;

export default new Vuex.Store({
	state: {
		initComplete: false,
		loggedin:false,
		tooltip: null,
		alert: null,
		accessToken:null,
		playlistsCache:null,
		userGroupData:null,
		groupRoomData:null,
		confirm:{
		  title:null,
		  description:null,
		  confirmCallback:null,
		  cancelCallback:null,
		},
	},






	mutations: {
		authenticate(state, payload) {
			state.loggedin = true;
			if (payload.access_token) {
				state.accessToken = payload.access_token;
				let expirationDate:number = new Date().getTime() + parseInt(payload.expires_in) * 1000;
				localStorage.setItem("accessToken", payload.access_token);
				localStorage.setItem("expirationDate", expirationDate.toString());
				SpotifyAPI.instance.setToken(payload.access_token);
			} else {
				localStorage.removeItem("accessToken");
				localStorage.removeItem("expirationDate");
			}
		},

		initComplete(state) { state.initComplete = true; },

		openTooltip(state, payload) { state.tooltip = payload; },
		
		closeTooltip(state) { state.tooltip = null; },

		confirm(state, payload) { state.confirm = payload; },

		playlistsCache(state, payload) {
			state.playlistsCache = payload;
			try {
				localStorage.setItem("playlistsCache", JSON.stringify(payload));
			}catch(error) {
				state.alert = "Maximum cache space reached, cannot cache your playlists sorry :("
			}
		},

		alert(state, payload) { state.alert = payload; },

		setUserGroupData(state, payload) { 
			state.userGroupData = payload;
			SockController.instance.user = payload;
			localStorage.setItem("userGroupData", JSON.stringify(payload));
		},
		setGroupRoomData(state, payload) { state.groupRoomData = payload; }
		
	},






	actions: {
		async startApp({ commit, state, dispatch }, payload) {
			//Security to make sure startApp isn't executed twice if changing URL while loading
			if (startPromise && payload.force !== true) return startPromise;
			
			SockController.instance.connect();
			
			state.initComplete = false;
			let token = localStorage.getItem("accessToken");
			if(token) {
				state.loggedin = true;
				state.accessToken = token;
				SpotifyAPI.instance.setToken(token);
				state.playlistsCache = JSON.parse( localStorage.getItem("playlistsCache") );
				if(payload.route.meta.needAuth && !SpotifyAPI.instance.isTokenExpired()) {
					let me = await SpotifyAPI.instance.call("v1/me");
					if(me && me.id) {
						StatsManager.instance.clientId = me.id;
					}
				}
			}
			
			let user = localStorage.getItem("userGroupData");
			if(payload.route.meta.needGroupAuth && user) {
				//Auto log user if joining a group
				commit("setUserGroupData", JSON.parse(user));
			}

			startPromise = new Promise(async (resolve, reject) => {
				commit("initComplete", true);
				resolve();
			});

			return startPromise;
		},

		openTooltip({commit}, payload) { commit("openTooltip", payload); },
		
		closeTooltip({commit}) { commit("closeTooltip", null); },

		confirm({commit}, payload) { commit("confirm", payload); },

		authenticate({commit}, payload) { commit("authenticate", payload); },

		playlistsCache({commit}, payload) { commit("playlistsCache", payload); },

		alert({commit}, payload) { commit("alert", payload); },

		setUserGroupData({commit}, payload) { commit("setUserGroupData", payload); },

		setGroupRoomData({commit}, payload) { commit("setGroupRoomData", payload); },
	}
})
