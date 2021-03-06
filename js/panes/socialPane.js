/*   Social Pane
**
**  This outline pane provides social network functions
**  Using for example the FOAF ontology.
**  Goal:  A *distributed* version of facebook, advogato, etc etc
**  - Similarly easy user interface, but data storage distributed
**  - Read and write both user-private (address book) and public data clearly
*/
tabulator.panes.register( tabulator.panes.socialPane = {

    icon: tabulator.Icon.src.icon_foaf,
    
    name: 'social',

    label: function(subject) {
        if (!tabulator.kb.whether(
            subject, tabulator.ns.rdf( 'type'), tabulator.ns.foaf('Person'))) return null;
        return "Friends";
    },
    
    tb: tabulator,

    render: function(s, myDocument) {

 
        var common = function(x,y) { // Find common members of two lists
            var both = [];
            for(var i=0; i<x.length; i++) {
                for(var j=0; j<y.length; j++) {
                    if (y[j].sameTerm(x[i])) {
                        both.push(y[j]);
                        break;
                    }
                }

            }
            return both;
        }
            
        var plural = function(n, s) {
            var res = ' ';
            res+= (n ? n : 'No');
            res += ' ' + s;
            if (n != 1) res += 's';
            return res;
        }
        
        var people = function(n) {
            var res = ' ';
            res+= (n ? n : 'no');
            if (n == 1) return res + ' person';
            return res + ' people';
        }
        var say = function(str) {
            var tx = myDocument.createTextNode(str);
            var p = myDocument.createElement('p');
            p.appendChild(tx);
            tips.appendChild(p);
        }
        
        var link = function(contents, uri) {
            if (!uri) return contents;
            var a =  myDocument.createElement('a');
            a.setAttribute('href', uri);
            a.appendChild(contents);
            return a;
        }
        
        var text = function(str) {
            return myDocument.createTextNode(str);
        }
        
        var buildCheckboxForm = function(lab, statement, state) {
            var f = myDocument.createElement('form');
            var input = myDocument.createElement('input');
            f.appendChild(input);
            var tx = myDocument.createTextNode(lab);
            tx.className = 'question';
            f.appendChild(tx);
            input.setAttribute('type', 'checkbox');
            var boxHandler = function(e) {
                tx.className = 'pendingedit';
                // alert('Should be greyed out')
                if (this.checked) { // Add link
                    try {
                        outline.UserInput.sparqler.insert_statement(statement, function(uri,success,error_body) {
                            tx.className = 'question';
                            if (!success){
                                tabulator.log.alert(null,"Message","Error occurs while inserting "+statement+'\n\n'+error_body);
                                input.checked = false; //rollback UI
                                return;
                            }
                            kb.add(statement.subject, statement.predicate, statement.object, statement.why);                        
                        })
                    }catch(e){
                        tabulator.log.error("Data write fails:" + e);
                        tabulator.log.alert("Data write fails:" + e);
                        input.checked = false; //rollback UI
                        tx.className = 'question';
                    }
                } else { // Remove link
                    try {
                        outline.UserInput.sparqler.delete_statement(statement, function(uri,success,error_body) {
                            tx.className = 'question';
                            if (!success){
                                tabulator.log.alert("Error occurs while deleting "+statement+'\n\n'+error_body);
                                this.checked = true; // Rollback UI
                            } else {
                                kb.removeMany(statement.subject, statement.predicate, statement.object, statement.why);
                            }
                        })
                    }catch(e){
                        tabulator.log.alert("Delete fails:" + e);
                        this.checked = true; // Rollback UI
                        return;
                    }
                }
            }
            input.checked = state;
            input.addEventListener('click', boxHandler, false)
            return f;
        }
        
        var span = function(html) {
            var s = myDocument.createElement('span');
            s.innerHTML = html;
            return s;
        }
        
        var oneFriend = function(friend, confirmed) {
            var box = myDocument.createElement('div');
            box.className = 'friendBox';

            var src = kb.any(friend, foaf('img')) || kb.any(friend, foaf('depiction'));
			//Should we try to add an empty image box here? If the image is not fetched we use this default image
			//The names would be aligned and the layout would look nice - Oshani
            var img;
            if (src) {
                img = myDocument.createElement("IMG")
                img.setAttribute('src', src.uri);
            } else {
                img = myDocument.createElement("div") // Spacer
            }
            img.className = 'foafThumb';
            box.appendChild(img)

			
            var t = myDocument.createTextNode(tabulator.Util.label(friend));
			if (confirmed) t.className = 'confirmed';
			if (friend.uri) {
				var a = myDocument.createElement('a');
				// a.setAttribute('href', friend.uri);
				a.addEventListener('click', function(){ // @@ No history left :-(
                                        return outline.GotoSubject(
                                            friend, true, tabulator.panes.socialPane, true)},
                                    false);
				a.appendChild(t);
				box.appendChild(a);
			} 
			else {
				box.appendChild(t);
			}
			
            outline.appendAccessIcons(kb, box, friend);
            return box;
        }
        
        //////////////////////////////// Event handler for existing file
        gotOne = function(ele) {
            var webid = myDocument.getElementById("webidField").value;
            tabulator.preferences.set('me', webid);
            tabulator.log.alert("You are now logged in as "+webid);
            ele.parentNode.removeChild(ele);
        }

        //////////////////////////////// EVent handler for new FOAF file
        tryFoaf = function() {

            myDocument.getElementById("saveStatus").className = "unknown";

            // Construct the initial FOAF file when the form bellow is submitted
            var inputField = myDocument.getElementById("fileuri_input");
            var targetURI = inputField.value;
            var foafname = myDocument.getElementById("foafname_input").value;
            var nick = myDocument.getElementById("nick_input").value;
            var initials = myDocument.getElementById("initials_input").value;
            var webid;
            var contents = "<rdf:RDF  xmlns='http://xmlns.com/foaf/0.1/'\n"+
                "    xmlns:rdf='http://www.w3.org/1999/02/22-rdf-syntax-ns#'\n" +
                "    xmlns:foaf='http://xmlns.com/foaf/0.1/'>";
            var localid;
            if (nick.length > 0) {
                localid = nick;
                contents += "<Person rdf:about='#"+nick+"'>";
                contents += "<nick>"+nick+"</nick>\n";
            } else {
                localid = initials;
                contents += "<Person rdf:about='#"+initials+"'>";
                contents += "<name>"+foafname+"</name>\n";
            }
            contents += "</Person>\n";
            contents += "<foaf:PersonalProfileDocument rdf:about=''> \
    <foaf:primaryTopic rdf:resource='#"+ localid +"'/> \
</foaf:PersonalProfileDocument>\n";

            contents += "</rdf:RDF>\n";
            webid = targetURI + "#" + localid;

            var content_type = "application/rdf+xml";
            var xhr = tabulator.util.XMLHTTPFactory();
            var doc = myDocument;
            xhr.onreadystatechange = function (){
                if (xhr.readyState == 4){
                    var result = xhr.status
                    var ele = doc.getElementById("saveStatus");
                    if (result == '201' || result == '204') {
                       ele.className = "success";
                       ele.innerHTML="<p>Success! A new, empty, profile has been created."+
                       "<br/>Your Web ID is now <br/><b><a target='me' href='"+webid+"'>"+webid+"</a></b>."+
                       "<br/>You can add more information to your public profile any time.</p>";
                       tabulator.preferences.set("me", webid);
                    } else {
                       ele.className = "failure";
                       ele.innerHTML="<p>There was a problem saving your public profile." +
                       "It has not been created." +
                       "<table>" +
                       "<tr><td>Status:</td><td>"+result+"</td></tr>" +
                       "<tr><td>Status text:</td><td>"+xhr.statusText+"</td></tr>" +
                       "</table>" +
                       "If you can work out what was wrong with the URI, " +
                       "you can change it above and try again.</p>";            
                    }
                }
            };
            xhr.open('PUT', targetURI, true);
            //assume the server does PUT content-negotiation.
            xhr.setRequestHeader('Content-type', content_type);//OK?
            xhr.send(contents);
            tabulator.log.info("sending "+"["+contents+"] to +"+targetURI);


        }
        
        //////////// Body of render():
        
        if (typeof tabulator == 'undefined') tabulator = this.tb;
        var outline = tabulator.outline;
        var thisPane = this; // For re-render
        var kb = tabulator.kb
        var div = myDocument.createElement("div")
        div.setAttribute('class', 'socialPane');
        var foaf = tabulator.ns.foaf;

        var tools = myDocument.createElement('div');
        tools.className = 'navBlock';
        div.appendChild(tools);
        var main = myDocument.createElement('div');
        main.className = 'mainBlock';
        div.appendChild(main);
        var tips = myDocument.createElement('div');
        tips.className ='navBlock';
        div.appendChild(tips);


        // Image top left
        var src = kb.any(s, foaf('img')) || kb.any(s, foaf('depiction'));
        if (src) {
            var img = myDocument.createElement("IMG")
            img.setAttribute('src', src.uri) // w640 h480
            img.className = 'foafPic';
            tools.appendChild(img)
        }
        var name = kb.any(s, foaf('name'));
        if (!name) name = '???';
        var h3 = myDocument.createElement("H3");
        h3.appendChild(myDocument.createTextNode(name));

        var div2 = myDocument.createElement("div");

        // @@ Addd: event handler to redraw the stuff below when me changes.
        tips.appendChild(tabulator.panes.utils.loginStatusBox(myDocument));
        
        var me_uri = tabulator.preferences.get('me');
        var me = me_uri && kb.sym(me_uri);
        
        var thisIsYou = (me && kb.sameThings(me,s));

        if (!me || thisIsYou) {  // If we know who me is, don't ask for other people
        
            var f = myDocument.createElement('form');
            tools.appendChild(f);
            var input = myDocument.createElement('input');
            f.appendChild(input);
            var tx = myDocument.createTextNode("This is you");
            tx.className = 'question';
            f.appendChild(tx);
            var myHandler = function(e) {
                var uri = this.checked? s.uri : '';
                tabulator.preferences.set('me', uri);
                tabulator.log.alert('You are now '+ (uri ? 'logged in as ' + uri :
                    'logged out. To log in again, find yourself and check "This is you".'));
                // div.parentNode.replaceChild(thisPane.render(s, myDocument), div);
            }
            input.setAttribute('type', 'checkbox');
            input.checked = (thisIsYou);
            input.addEventListener('click', myHandler, false);
        }
/*
        if (thisIsYou) {  // This is you
            var h = myDocument.createElement('h2');
            h.appendChild(myDocument.createTextNode('Your public profile'));
            tools.appendChild(h);
        }
*/
        var knows = foaf('knows');
    //        var givenName = kb.sym('http://www.w3.org/2000/10/swap/pim/contact#givenName');
        var familiar = kb.any(s, foaf('givenname')) || kb.any(s, foaf('firstName')) ||
                    kb.any(s, foaf('nick')) || kb.any(s, foaf('name'));
        if (familiar) familiar = familiar.value;
        var friends = kb.each(s, knows);
        
        // Do I have a public profile document?
        var profile = null; // This could be  SPARQL { ?me foaf:primaryTopic [ a foaf:PersonalProfileDocument ] }
        var editable = false;
        if (me) {
            var works = kb.each(undefined, foaf('primaryTopic'), me)
            var message = "";
            for (var i=0; i<works.length; i++) {
                if (kb.whether(works[i], tabulator.ns.rdf('type'),
                                            foaf('PersonalProfileDocument'))) {

                    editable = outline.UserInput.sparqler.editable(works[i].uri, kb);
                    if (!editable) { 
                        message += ("Your profile <"+tabulator.Util.escapeForXML(works[i].uri)+"> is not remotely editable.");
                    } else {
                        profile = works[i];
                        break;
                    }
                }
            }

            if (thisIsYou) { // This is about me
                if (!profile) {
                    say(message + "\nI couldn't find an editable personal profile document.");
                } else  {
                    say("Editing your profile <"+tabulator.Util.escapeForXML(profile.uri)+">.");
                     // Do I have an EDITABLE profile?
                    editable = outline.UserInput.sparqler.editable(profile.uri, kb);
                }
            } else { // This is about someone else
                // My relationship with this person

                var h3 = myDocument.createElement('h3');
                h3.appendChild(myDocument.createTextNode('You and '+familiar));
                tools.appendChild(h3);

                cme = kb.canon(me);
                var incoming = kb.whether(s, knows, cme);
                var outgoing = false;
                var outgoingSt = kb.statementsMatching(cme, knows, s);
                if (outgoingSt.length) {
                    outgoing = true;
                    if (!profile) profile = outgoingSt.why;
                }

                var tr = myDocument.createElement('tr');
                tools.appendChild(tr);
                
                var youAndThem = function() {
                    tr.appendChild(link(text('You'), me_uri));
                    tr.appendChild(text(' and '));
                    tr.appendChild(link(text(familiar), s.uri));
                }

                if (!incoming) {
                    if (!outgoing) {
                        youAndThem();
                        tr.appendChild(text(' have not said you know each other.'));
                    } else {
                        tr.appendChild(link(text('You'), me_uri));
                        tr.appendChild(text(' know '));
                        tr.appendChild(link(text(familiar), s.uri));
                        tr.appendChild(text(' (unconfirmed)'));
                    }
                } else {
                    if (!outgoing) {
                        tr.appendChild(link(text(familiar), s.uri));
                        tr.appendChild(text(' knows '));
                        tr.appendChild(link(text('you'), me_uri));
                        tr.appendChild(text(' (unconfirmed).')); //@@
                        tr.appendChild(text(' confirm you know '));
                        tr.appendChild(link(text(familiar), s.uri));
                        tr.appendChild(text('.'));

                    } else {
                        youAndThem();
                        tr.appendChild(text(' say you know each other.'));
                    }
                }


                if (editable) {
                    var f = buildCheckboxForm("You know " + familiar,
                            new tabulator.rdf.Statement(me, knows, s, profile), outgoing)
                    tools.appendChild(f);
                } // editable
                 
                if (friends) {
                    var myFriends = kb.each(me, foaf('knows'));
                    if (myFriends) {
                        var mutualFriends = common(friends, myFriends);
                        var tr = myDocument.createElement('tr');
                        tools.appendChild(tr);
                        tr.appendChild(myDocument.createTextNode(
                                    'You'+ (familiar? ' and '+familiar:'') +' know'+
                                    people(mutualFriends.length)+' found in common'))
                        if (mutualFriends) {
                            for (var i=0; i<mutualFriends.length; i++) {
                                tr.appendChild(myDocument.createTextNode(
                                    ',  '+ tabulator.Util.label(mutualFriends[i])));
                            }
                        }
                    }
                    var tr = myDocument.createElement('tr');
                    tools.appendChild(tr);
                } // friends
            } // About someone else
        } // me is defined
        // End of you and s
        
        // div.appendChild(myDocument.createTextNode(plural(friends.length, 'acqaintance') +'. '));


        // Find the intersection and difference sets
        var outgoing = kb.each(s, foaf('knows'));
        var incoming = kb.each(undefined, foaf('knows'), s);
        var confirmed = [];
        var unconfirmed = [];
        var requests = [];
        
        for (var i=0; i<outgoing.length; i++) {
            var friend = outgoing[i];
            var found = false;
            for (var j=0; j<incoming.length; j++) {
                if (incoming[j].sameTerm(friend)) {
                    found = true;
                    break;
                }
                
            }
            if (found) confirmed.push(friend);
            else unconfirmed.push(friend);
        } // outgoing

        for (var i=0; i<incoming.length; i++) {
            var friend = incoming[i];
            var lab = tabulator.Util.label(friend);
            var found = false;
            for (var j=0; j<outgoing.length; j++) {
                if (outgoing[j].sameTerm(friend)) {
                    found = true;
                    break;
                }
                
            }
            if (!found) requests.push(friend);
        } // incoming

//        cases = [['Confirmed friends', confirmed],['Unconfirmed friends', unconfirmed],['Friend Requests', requests]];
        cases = [['Acquaintances', outgoing],['Mentioned as acquaintances by: ', requests]];
        for (var i=0; i<cases.length; i++) {
            var thisCase = cases[i];
            var friends = thisCase[1];
			if (friends.length == 0) continue; // Skip empty sections (sure?)
            
            var h3 = myDocument.createElement('h3');
            h3.appendChild(myDocument.createTextNode(thisCase[0]));
            main.appendChild(h3);

            var items = [];
            for (var j=0; j<friends.length; j++) {
                items.push([tabulator.Util.label(friends[j]), friends[j]]);
            }
            items.sort();
            var last = null;
            for (var j=0; j<items.length; j++) {
                var friend = items[j][1];
				if (friend.sameTerm(last)) continue; // unique
                last = friend; 
				if (tabulator.Util.label(friend) != "..."){	//This check is to avoid bnodes with no labels attached 
												//appearing in the friends list with "..." - Oshani
					main.appendChild(oneFriend(friend));
				}
            }
                
        }
            
        // var plist = kb.statementsMatching(s, knows)
        // outline.appendPropertyTRs(div, plist, false, function(pred){return true;})

        var h3 = myDocument.createElement('h3');
        h3.appendChild(myDocument.createTextNode('Basic Information'));
        tools.appendChild(h3);

        var preds = [ tabulator.ns.foaf('homepage') , 
                tabulator.ns.foaf('weblog'), 
                tabulator.ns.foaf('workplaceHomepage'),  tabulator.ns.foaf('schoolHomepage')];
        for (var i=0; i<preds.length; i++) {
            var pred = preds[i];
            var sts = kb.statementsMatching(s, pred);
            if (sts.length == 0) {
                // if (editable) say("No home page set. Use the blue + icon at the bottom of the main view to add information.")
            } else {
                var uris = [];
                for (var j=0; j<sts.length; j++) {
                    st = sts[j];
                    if (st.object.uri) uris.push(st.object.uri); // Ignore if not symbol
                }
                uris.sort();
                var last = "";
                for (var j=0; j<uris.length; j++) {
                    uri = uris[j];
                    if (uri == last) continue; // uniques only
                    last = uri;
                    var hostlabel = ""
                    var lab = tabulator.Util.label(pred);
                    if (uris.length > 1) {
                        var l = uri.indexOf('//');
                        if (l>0) {
                            var r = uri.indexOf('/', l+2)
                            var r2 = uri.lastIndexOf('.', r)
                            if (r2>0) r = r2;
                            hostlabel = uri.slice(l+2,r);
                        }
                    }
                    if (hostlabel) lab = hostlabel + ' ' + lab; // disambiguate
                    var t = myDocument.createTextNode(lab);
                    var a = myDocument.createElement('a');
                    a.appendChild(t);
                    a.setAttribute('href', uri);
                    var d = myDocument.createElement('div');
                    d.className = 'social_linkButton';
                    d.appendChild(a);
                    tools.appendChild(d);
                
                }
            }
        }

        var preds = [  tabulator.ns.foaf('openid'),
                tabulator.ns.foaf('nick')
                ];
        for (var i=0; i<preds.length; i++) {
            var pred = preds[i];
            var sts = kb.statementsMatching(s, pred);
            if (sts.length == 0) {
                // if (editable) say("No home page set. Use the blue + icon at the bottom of the main view to add information.")
            } else {
                outline.appendPropertyTRs(tools, sts, false, function(pred){return true;});
            }
        }

/*
        var h3 = myDocument.createElement('h3');
        h3.appendChild(myDocument.createTextNode('Look up'));
        tools.appendChild(h3);

        // Experimental: Use QDOS's reverse index to get incoming links - defunct
        var uri = 'http://foaf.qdos.com/reverse/?path=' + encodeURIComponent(s.uri);
        var t = myDocument.createTextNode('Qdos reverse links');
        //var a = myDocument.createElement('a');
        //a.appendChild(t);
        //a.setAttribute('href', uri);
        var d = myDocument.createElement('div');
        d.className = 'social_linkButton';
        d.appendChild(t);
        outline.appendAccessIcon(d, uri);
        tools.appendChild(d);
*/



        return div;
    }  // render()

}, false);  // tabulator.panes.register({})

if (tabulator.preferences && tabulator.preferences.get('me')) {
    tabulator.sf.lookUpThing(tabulator.kb.sym(tabulator.preferences.get('me')));
};
//ends

