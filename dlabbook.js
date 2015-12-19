$(function(){
	//Cookies.set('address', 'Hello Cookie');
	//console.log(Cookies.get('address'));
	// todo
	//	figure out function definition / work flow at interface of JS and solidity:
	/*		- find out if current geth address is registered, if so use it and display "registered as [name]" in header
			- if no address is registered, send user first to "register" page
			- make seletion of all available accounts in settings as table:
			
			ethereum address		registered to			funds
			0xasdlkfrkj4rhf  		s.buergel@gmail.com		10 ether
			0x324o324r09239vf		sbuergel@ethz.ch		123 szabo
			0x234kjh123kjhds		[register now]			1 ether
			[create new address]
			
			- on publish: 
				1. send to IPFS (done)
				2. send ipfs hash from currently selected address to contract
	*/
	
	//	- allow user to paste abi + evm code and deploy contract from that (in case no compiler is available)
	//		implementation: 
	//		- add button "add code manually" next to "compile" button, this shows two text boxes for abi + code where user can paste data
	//		- abi + code from normal compile should get auto-filled into text box as well so that user could manipulate abi or byte-code manually for experimenting
	//		- when one set of text boxes is shown, a second button appears "add contract"
	//	- contracts for name registry and content registry should be user-settable in settings tab
	//		- each contract that is deployed should have a button "use as name reg" and "use as content reg" which
	//		  which is updating the address, and abi definition in the settings tab
	//		- function which is called on "register user", "find accounts" or "publish content" should be user-selectable
	//	- make all JS + HTML code editable and deployable to IPFS (and using this notary service)
	//		- copy text to some editor
	//		- find out how to handle separate files (web3.js, ipfs.js, ...)
		
	contracts = [];

/* 
//	buddies: (for approving change of address)
//		B1 adds address of buddies B2, B3, B4 and number N to the contract D1
//		if N of the buddies B2, ... BN approve, 
//			the original address is marked inactive 
//			and a new address is registered to that name
	
	input fields:
		select account (show address + potentially name that it is registered to)
		register account "
		create new account
//		unregister account (needs approval of owner or N buddies)
		
	on startup:
#		check availability of IPFS (try publishing)
		check availability of geth (check if we have access to an unlocked account with some Ether)
		
	on publish:
		find username of address
//		encrypt content
#		publish IPFS hash
#		register IPFS hash as content of address
		
	publishing priorities
		connect to local geth and publish to pre-coded address and abi
		fallback 1: connect to publicly available geth (which is later exposed via API, not giving everyone full access)
		alternative 1: connect to some other geth node
#		alternative 2: call / deploy custom contract 
		
	*/

    // click on menu items
    $("#navPublish").click(function(event){
        $("#contentBrowse").hide();
        $("#contentSign").hide();
        $("#contentDebug").hide();
        $("#contentSettings").hide();
        $("#contentEdit").hide();
        $("#contentPublish").fadeIn(800);
    });

    $("#navBrowse").click(function(event){
        reloadOwnContent();
        reloadOtherContent();
        $("#contentPublish").hide();
        $("#contentSign").hide();
        $("#contentDebug").hide();
        $("#contentSettings").hide();
        $("#contentEdit").hide();
        $("#contentBrowse").fadeIn(800);
    });

    $("#navSign").click(function(event){
        $("#contentPublish").hide();
        $("#contentBrowse").hide();
        $("#contentDebug").hide();
        $("#contentSettings").hide();
        $("#contentEdit").hide();
        $("#contentSign").fadeIn(800);
    });

    $("#navDebug").click(function(event){
        $("#contentPublish").hide();
        $("#contentBrowse").hide();
        $("#contentSign").hide();
        $("#contentSettings").hide();
        $("#contentEdit").hide();
        $("#contentDebug").fadeIn(800);
    });

    $("#navSettings").click(function(event){
        $("#contentPublish").hide();
        $("#contentBrowse").hide();
        $("#contentSign").hide();
        $("#contentDebug").hide();
        $("#contentEdit").hide();
        $("#contentSettings").fadeIn(800);
    });

    $("#navEdit").click(function(event){
        $("#contentPublish").hide();
        $("#contentBrowse").hide();
        $("#contentSign").hide();
        $("#contentDebug").hide();
        $("#contentSettings").hide();
        $("#contentEdit").fadeIn(800);
    });

    // hide all content except for publish on start
    $("#contentPublish").hide();
    $("#contentBrowse").hide();
    $("#contentSign").hide();
    $("#contentDebug").hide();
    $("#contentSettings").hide();
    //$("#contentEdit").hide();
    
    $("#ipfsPublishInfo").hide();   // only visible once we publish something to IPFS
   
    // create web3 object if required
	if(typeof web3 === 'undefined')
	{
        info("creating web3...");
		updateGethAddress();

        // define address of the contract (e.g. copy from sandbox)
        //var address = "0xdf315f7485c3a86eb692487588735f224482abe3";
        
        // use json function header (defined above)
        //var contract = web3.eth.contract(abi);
        //instance = contract.at(address);

        // TODO: 
		// try to compile using the local solidity compiler. if this fails use byte code (which is also supplied via "advanced" settings)
		// if contract cannot be deployed (because, e.g. geth or the solidity compiler is not available),
		//      connect to to pre-shared contract address + abi
		//      (warning: this will only work in the main net and the sandbox if we deployed that contract on sandbox start-up)
		
		if (!web3.isConnected())
		{
            error("Web3 could not connect to Ethereum node. Make sure you have geth running locally and start it with 'geth --rpc --rpccorsdomain '*' --rpcaddr 0.0.0.0'");
		}
		else
		{
            info("connected to web3");
		}
	}
	
	// check if IPFS is available (by attempting to write one byte to it)
	try
	{
	    // exposing ipfs on that server is a serious security vulnerability
	    // TODO: this will in the future be served via an intermediate web service
    	updateIpfsAddress();
    	var buf = new ipfs.Buffer(0);
    	ipfs.add(buf, function(err, res){
            if (err || !res)
            {
                // this is async, so we cannot throw the error as the catch block below is already done.
                // render error again

                error("Could not connect to IPFS node. Make sure <ul><li>you have IPFS running on your local machine, start it with 'ipfs daemon'</li><li>before you start the daemon, set the cors domain with 'ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin \"[\\\"*\\\"]\"'</li></ul>ipfs error: " + err + "</div>");
                return;
            }
            info("connected to local IPFS node");
    	})
	}
	catch (err)
	{
		error("Could not connect to IPFS node. Make sure <ul><li>you have IPFS running on your local machine, start it with 'ipfs daemon'</li><li>before you start the daemon, set the cors domain with 'ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin \"[\\\"*\\\"]\"'</li></ul>ipfs error: " + err + "</div>");
	}
	
    $("#buttonPublish").button().click(function(event){
        $("#debug").append(document.createTextNode("clicked buttonPublish"));
        
        // read username
        var username = $("#username").val();
        if (username.length < 5)
        {
            error("username has to be at least 5 characters long");
        }
        else
        {
            // check if username is already registered
            if (!instanceNameReg.IsRegistered(username))
            {
                info("user " + username + " has not been registered yet, we will do that now.");
                instanceNameReg.Register(username);
            }
            else
                info("you are registered as " + username);
			try
			{
            info("publishing: " + $("#dataToPublish").val());
            // publish data to IPFS
        	updateIpfsAddress();
        	var buf = new ipfs.Buffer($("#dataToPublish").val());
        	ipfs.add(buf, function(err, res){
        	    // note: this function is executed asynchronously
        	    // i.e. the content of hash will most likely not be available yet outside of this function (synchronous code)
                if (err || !res) 
					return console.log(err);
        	    var hash = res.Hash;
            	$("#ipfsPublishInfo").html("IPFS address (hash) of the data: <a href='https://gateway.ipfs.io/ipfs/" + hash + "'>" + hash + "</a>");
            	$("#ipfsPublishInfo").fadeIn(1000);
            	
            	// publish to Ethereum
            	instanceContReg.registerContent(hash);
        	});	
			}
			catch (e)
			{
				error (e);
			}
        }
    });
    
	$("#updateGethSettings").click(function(event){
		updateGethAddress();
	});
	$("#updateIpfsAddress").click(function(event){
		updateIpfsAddress();
	});
	
	$("#reloadOwnContent").click(function(event){
		reloadOwnContent();
	})
	$("#reloadOtherContent").click(function(event){
		reloadOwnContent();
	})
	
	$("#buttonCompile").click(function(event){
		var source = editor.getSession().getValue();
		try
		{
			// compiled is a variblae containing JSON-formatted output (containing abi + evm code from all contract in source)
			compiled = web3.eth.compile.solidity(source);

			// remove all content of previous compile runs
			$("#contractContent").empty();	// remove from UI
			contracts = [];					// remove from compile output

			var c = 0;
			for (var contractName in compiled)
			{	// looping over all contracts (we might have more than one contract in code base)
				info("found contract: " + contractName);
				contractJson = eval("compiled." + contractName);

				abi = contractJson.info.abiDefinition;
				evmCode = contractJson.code;
				source = contractJson.info.source;
				
				// appending compiled output to contracts array
				// todo: we might not need to store abi and evmCode here if we use the text boxes during deployment
				contracts.push(new contrHolder(source, abi, evmCode));
				contracts[c].status = 1;

				// todo: should abi be escaped to prevent some html injections? (is this even possible from JSON?)
				
				// display compiled output of contract
				$("#contractContent").append(
				"<div class=\"row\"><div class=\"col-md-12\"><h3>contract " + 
				contractName + 
				"</h3></div></div>" + 
				"<div class=\"row\"><div class=\"col-md-4 minimizable\"><div>abi:</div><div style=\"color:blue;\">[expand]</div></div>" + 
				"<div class=\"col-md-8 white-gradient minimize\"><textarea rows=\"5\" style=\"width: 100%;\" id=\"abi" + c + "\">" + 
				JSON.stringify(abi) + 
				"</textarea></div></div>" + 
				"<div class=\"row\"><div class=\"col-md-4 minimizable\"><div><hr />code:</div><div style=\"color:blue;\">[expand]</div></div>" + 
				"<div class=\"col-md-8 white-gradient minimize\"><hr /><textarea rows=\"5\" style=\"width: 100%;\" id=\"code" + c + "\">" + 
				evmCode + 
				"</textarea></div></div>" + 
				"<div class=\"row\"><div class=\"col-md-4\"><div><hr />address:</div></div>" + 
				"<div id=\"contractAddress" + c + "\" class=\"col-md-8\" style=\"word-break: break-all;\"><hr />[contract not deployed]</div></div>");
				c = c + 1;
			}
			
			$(".minimizable").click(function(){
				// clicking on an expandable item toggles it
				var nxt = $(this).next();
				var children = $(this).children();
				if ($(children[1]).text() == "[collapse]")
				{
					$(nxt).addClass("white-gradient");
					$(nxt).addClass("minimize");
					$(children[1]).text("[expand]");
				}
				else
				{
					$(nxt).removeClass("white-gradient");
					$(nxt).removeClass("minimize");
					$(children[1]).text("[collapse]")
				}

			});
		}
		catch (e)
		{
			error("Compile error: " + e);
		}
	})
	
	$("#buttonDeploy").click(function(event){
		// clicking "deploy" creates the contract on the blockchain
		try
		{
			var primaryAddress = web3.eth.accounts[0];
			
			for (var c = 0; c < contracts.length; c++)
			{
				// todo: read abi and code from text areas
				var abi = JSON.parse($("#abi" + c).val());
				var code = $("#code" + c).val();
				console.log(abi);
				console.log(code);
				var MyContract = web3.eth.contract(abi);
				contracts[c].contract = MyContract.new({from: primaryAddress, data: code, gas: 1000000})
				$("#contractAddress" + c).text("[waiting for contract to be mined...]");
				contracts[c].status = 2;
			}
		}
		catch (e)
		{
			error("Deployment error: " + e);
		}
	})
	
	// configuring the solidity (actually JS) editor
	editor = ace.edit("editor");
    editor.setTheme("ace/theme/twilight");
    editor.session.setMode("ace/mode/javascript");
	editor.getSession().setUseWorker(false);	// disable syntax checker since we just use the javascript version which does not know contracts and other solidity-only features
	
	setInterval(updateLastBlockCounter, 2000);	// updates UI with network info
});

function updateLastBlockCounter()
{	// this function is being called periodically to update the UI with network stats
	try
	{
		var blkNo = web3.eth.blockNumber;
		$("#lastBlockNumber").text(blkNo);
		var latestBlk = web3.eth.getBlock("latest")
		var blkTime = latestBlk.timestamp - web3.eth.getBlock(latestBlk.number - 1).timestamp;
		$("#lastBlockTime").text(blkTime);
		$("#lastBlockTx").text(latestBlk.transactions.length);
		$("#pendingTx").text(web3.eth.getBlock("pending", true).transactions.length);
		$("#hashRate").text(web3.eth.hashrate);
		for (var c = 0; c < contracts.length; c++)
		{	// check all contracts
			if (contracts[c].status == 1)
				$("#contractAddress" + c).html("<hr />[contract not deployed]");
			else if (contracts[c].status == 2)
			{	// if contract has status "deployed" then check if it has been mined, if so, show its address
				if (typeof contracts[c].contract.address === 'undefined')
					$("#contractAddress" + c).html("<hr />[waiting for contract to be mined]");
				else
				{
					contracts[c].status = 3;
					$("#contractAddress" + c).html("<hr />" + contracts[c].contract.address);
				}
			}
			else if (contracts[c].status == 3)
				$("#contractAddress" + c).html("<hr />" + contracts[c].contract.address);
			else if (contracts[c].status == 4)
				$("#contractAddress" + c).html("<hr />[error]");
			else
				$("#contractAddress" + c).html("<hr />[unknown contract status id: " + contracts[c].status + "]");
		}
	}
	catch (e)
	{
		$("#lastBlockNumber").text("error: " + e);
	}
}

function reloadOwnContent()
{
    console.log("reloading own content:")
    var target = $("#ownContentBrowse");
    reloadContentFromAddress(target, defaultAccount);
}

function reloadOtherContent()
{
    var adr = $("#otherAddressBrowse").val()
    var target = $("#otherContentBrowse");
    reloadContentFromAddress(target, adr);
}

function reloadContentFromAddress(target, address)
{
    var contCount = instanceContReg.getNumberOfEntries(address).c[0];
    target.empty();
    target.append(contCount + " entries:<br /><br />");
    for (c = 0; c < contCount; c++)
    {
        var time = instanceContReg.getContentItemTime(address, c).c[0];
        var myDate = new Date(1000*time);
        var date = myDate.toString()
        var ipfsHash = instanceContReg.getContentItemIpfsAddress(address, c);
        target.append(date + ": <a href='https://gateway.ipfs.io/ipfs/" + ipfsHash + "'>" + ipfsHash + "</a><br />");
    }
}

function updateGethAddress()
{	// reads the geth address from the settings tab and creates a web3 object which connects to this address
    var gethAddress = $("#gethAddress").val();
    web3 = new Web3(new Web3.providers.HttpProvider(gethAddress));
	info("set geth node address to: " + gethAddress);
	//console.log("Found the following accounts: " + web3.eth.accounts);
	//$("#gethDebug").append("Found the following accounts: " + web3.eth.accounts);
	try
	{
		info("latest block number: " + web3.eth.blockNumber);
		
		// set default account
		web3.eth.defaultAccount = web3.eth.accounts[0];
		defaultAccount = web3.eth.accounts[0];
		// read abi definition and address for both contracts (name registry and content registry) from UI and use values to create contract object from them
		var contRegAbi = JSON.parse($("#contRegAbi").val());
		var nameRegAbi = JSON.parse($("#nameRegAbi").val());
		var contRegContractAddress = $("#contRegAddress").val();
		var nameRegContractAddress = $("#nameRegAddress").val();
		instanceContReg = web3.eth.contract(contRegAbi).at(contRegContractAddress);
		instanceNameReg = web3.eth.contract(nameRegAbi).at(nameRegContractAddress);
		
		/* contract instances can now be used as follows:
			- const functions with return value
			var num = instanceContReg.getNumberOfEntries(web3.eth.accounts[0]).c[0]
			
			- non-const functions with return value (async):
			*/
	}
	catch (e)
	{
		error(e);
	}
}

function contrHolder (source, abi, code)
{	// object holding solidity source code, abi definition and evm code of a contract
	this.source = source;
	this.abi = abi;
	this.code = code;
	this.address = "";
	this.status = 0;	// 0 = not compiled, 1 = not deployed, 2 = not mined, 3 = deployed
}

function updateIpfsAddress()
{	// the IPFS node address is read from the settings tab, then the ipfs object is (re-)created with this endpoint
    var ipfsAddress = $("#ipfsAddress").val();
	ipfs = ipfsAPI(ipfsAddress);
    info("Set ipfs node address to: " + ipfsAddress);
}

function error(msg)
{	// displays an error message in browser console, as bootstrap error message and in debug tab
	console.log("Error: " + msg)
	$(".container").prepend("<div class='alert alert-danger alert-dismissible' role='alert'><button type='button' class='close' data-dismiss='alert' aria-label='Close'><span aria-hidden='true'>&times;</span></button><strong>Error!</strong><br />" + msg + "</div>");
	$("#debug").append(document.createTextNode("Error: " + msg));
	$("#debug").append("<br />");
}

function info(msg)
{	// displays an info message in browser console and in debug tab
	console.log("Info: " + msg)
	
	// todo: we might want to pop up if we enable debug mode or increased verbosity			
	//$(".container").prepend("<div class='alert alert-info alert-dismissible' role='alert'><button type='button' class='close' data-dismiss='alert' aria-label='Close'><span aria-hidden='true'>&times;</span></button><strong>Info:</strong><br />" + msg + "</div>");
	$("#debug").append(document.createTextNode("Info: " + msg));
	$("#debug").append("<br />");
}
