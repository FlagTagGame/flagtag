let socket = io("/home");
if(localStorage.getItem("settings") === null) localStorage.setItem("settings", `{"name": "Odd Ball"}`);

let settings = JSON.parse(localStorage.getItem("settings"));

updateGamesList();
setInterval(updateGamesList, 2000);

$("#createGame").click(function(e){
	socket.emit("create game", $("#gameNameText").val(), gameID => {
		$("#gameNameText").val("");

		if(gameID) {
			location.href = "/game?g=" + gameID;
		} else {
			alert("Error");
		}
	});
});

$("#saveSettings").click(function(e){
	settings.name = $("#usernameText").val();

	localStorage.setItem("settings", JSON.stringify(settings));

	$("#saveSettingsWarning").slideDown();
	setTimeout(() => {
		$("#saveSettingsWarning").slideUp();
	}, 1500);
});

function updateGamesList(){
	socket.emit("list games", games => {
		$("#gamesList tbody").empty();
		games.forEach(item => {
			$("#gamesList tbody").append(`
				<tr data-id="${item.id}">
					<td>${item.name}</td>
					<td>${item.players}</td>
				</tr>
			`);
		});
		createGameListEventHandler();
	});
}

function createGameListEventHandler(){
	$("#gamesList tbody tr").click(function(e){
		let gameID = $(this).attr("data-id");

		location.href = "/game?g=" + gameID;
	});
}

$("#usernameText").val(settings.name);