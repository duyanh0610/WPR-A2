const express =require('express');
const mongodb= require('mongodb')


const a= express();
let db = null;


// client 
a.use(express.static('public'));
//decode req.body (form-data)
a.use(express.urlencoded({extended:true}));
//decode req.body (post body message)
a.use(express.json());


//connect db
async function startServer(){
    const dtbase='wpr-quiz';
    const url= `mongodb://localhost:27017/${dtbase}`; 
    const client = await mongodb.MongoClient.connect(url);
    db= client.db();
    console.log('Connected to db');
    // console.log(db.collection('questions').find().toArray())

    //listening 
    a.listen(3000, function(){
        console.log('Listening on port 3000!');
    });
}
startServer();



//create attemps
a.post('/attempts', async function(req,res){
    const docs = await db.collection('questions').aggregate([{$sample:{size: 10}}]).toArray();
    
    // console.log(docs)

    // store and delete correct answers
    const correct = {};
    for (const d of docs) { 
        let quesID = d._id;
        correct[quesID] = d.correctAnswer;
        delete d.correctAnswer;
    }
    
    //assign 
    const _id= mongodb.ObjectId();
    const questions = docs;
    const realtime = new Date();
    const completed = 'false';

   // pass into attempt
    let attempt = { 
        _id: _id, 
        questions: questions,
        startedAt: realtime, 
        completed: completed
    }
    res.status(201).json(attempt);
    
    let correctAnswer ='correctAnswers';
    attempt[correctAnswer] = correct;

    let result=await db.collection('submit').insertOne(attempt);

})

//submit and result
a.post('/attempts/:id/submit', async function(req,res){ 
    const attemptId= req.params.id;
    const result = await db.collection('submit').findOne({_id:mongodb.ObjectId(attemptId)});
    
    const startedAt = result.startedAt;
    
    delete result.completed;
    delete result.startedAt;


    const answers = req.body.answers;

    let score= 0;
    let scoreText= " ";

    //count score 
    for ( const quesID in result.correctAnswers ){ 
        if (result.correctAnswers[quesID] === answers[quesID] ) { 
            score += 1;
        }else { 
            score += 0 ;
        } 
    }
    //score text
    if ( score < 5 ) { 
        scoreText = "Practice more to improve it :D";
    } else if  ( score >= 5 && score< 7) { 
        scoreText = "Good, keep up!";
    } else if ( score >= 7 && score < 9 ) { 
        scoreText = "Well done!";
    } else if ( score >= 9 && score <= 10 ) { 
        scoreText = "Perfect!";
    } else { 
        scoreText ="Not valid score";
    }
 
    result.startedAt =startedAt;
    result.answers= answers;
    result.score= score;
    result.scoreText= scoreText;
    result.completed= true;

    res.json(result);
})