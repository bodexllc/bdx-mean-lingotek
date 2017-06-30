// Dependencies
var express = require('express');
var request = require('request');
var mongodb = require('mongodb');
var app = express();
var unirest = require('unirest');
var projectID = 'd00dc1d7-60df-4919-b944-41e38cd02ea9';
var accessToken = 'e58d7e4a-0953-4d91-8aaa-4b838b669f2f';
var strings = require('string');
var inpStrG = null;
var result = null;
var bodyParser = require('body-parser');

app.use(express.static(__dirname + "/public"));
app.use(bodyParser.json());
var db = new mongodb.Db('bdxlingotek', new mongodb.Server('127.0.0.1', 27017), {
    safe: true
});

var inpstr;
var langcode;
app.get('/', function(req, res) {
    res.send('index.html');
});

app.post('/trans', function(req, res) {
    inpstr = req.body.itxt;
    langcode = req.body.lang;
    console.log('Initiating Stage-1');
    console.log('Uploading Content....');
    /*mongo check*/
    db.open(function(err) {
        db.collection('lingodata', function(err, collection) {
            collection.find({
                'Entered_text': inpstr,
                'Locale_code': langcode
            }).count(function(err, response) {
                if (response < 1) {
                    createDoc(inpstr, langcode, res);
                } else {

                    collection.findOne({
                        'Entered_text': inpstr,
                        'Locale_code': langcode
                    }, function(err, item) {
                        console.log('Find Doc');
                        var dataS = JSON.stringify(item.Trans_data);
                        res.send(strings(dataS).between('"', '"').s);
                    });


                }
            }); //find ends
        }); //db.collections ends

    }); //open close




});




//createDoc
var createDoc = function(inpStr, lang_code, res) {
    inpStrG = inpStr;
    unirest.post('https://sandbox-api.lingotek.com/api/document')
        .header({
            'Authorization': 'bearer ' + accessToken
        })
        .send({
            'project_id': projectID,
            'locale_code': 'en_US',
            'format': 'HTML_OKAPI',
            'title': 'meanLingotek',
            'content': inpStr
        })
        .end(function(response) {
            var docid = response.body.properties.id;
            console.log('Upload Completed');
            console.log('DocumentId Created');
            console.log('Initiating Stage-2');
            console.log('Requesting for translation');
            translateDoc(docid, lang_code, res);
        });
}




//translateDoc

var translateDoc = function(docid, lang_code, res) {

        var turl = '/api/document/' + docid + '/translation'
        var s1 = 'https://sandbox-api.lingotek.com/api/document/';
        var s2 = docid;
        var s3 = '/translation';

        var resa = s1.concat(s2).concat(s3);


        request.post({
                url: resa,
                headers: {
                    'Authorization': 'bearer ' + accessToken
                },
                form: {
                    '\
locale_code': lang_code
                }
            },
            function(err, httpResponse, body) {

                try {
                    var data = JSON.parse(body);
                    var out = data.messages;
                    var n = strings(out).contains('not found');
                } catch (err) {

                    console.log('Translation In Progress....');

                    downloadDoc(docid, lang_code, res);
                }



                switch (n) {
                    case true:

                        setTimeout(translateDoc(docid, lang_code, res), 3000);

                        break;
                    case false:

                        downloadDoc(docid, lang_code, res);
                        break;
                }
            });


    }
    //download doc
var downloadDoc = function(docid, lang_code, res) {
    unirest.get('https://sandbox-api.lingotek.com/api/document/' + docid + '/conten\
t?locale_code=' + lang_code)
        .header({
            'Authorization': 'bearer ' + accessToken
        })
        .end(function(response) {

            if (response.body === inpStrG) {
                setTimeout(downloadDoc(docid, lang_code, res), 3000);
            } else {
                console.log('Translation Done');
                console.log('Initiating Stage-3');
                console.log('Downloading Translations');
                result = response.body;
                res.send(result);
                db.open(function(err) {
                    db.collection('lingodata', function(err, collection) {
                        collection.insert({
                            'Entered_text': inpstr,
                            'Locale_code': langcode,
                            'Trans_data': result
                        });
                        console.log('New Doc Inserted in MongoDB');
                    }); //db.collections ends

                }); //open close




                deleteDoc(docid)
            }

        });


}


//delete doc
var deleteDoc = function(docid) {
    unirest.delete('https://sandbox-api.lingotek.com/api/document/' + docid)
        .header({
            'Authorization': 'bearer ' + accessToken
        })
        .end(function(response) {



        });
}




app.listen('3000', function() {
    console.log("Server running @3000");
});
