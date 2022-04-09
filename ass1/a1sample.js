/*
 * This is a sample script for MongoDB Assignment
 * It shows recommended practice and basic steps
 * to connect to a database server, to set default database
 * and to drop a collection's working copy
 * 
 * It also shows you how to supply command line arguments to 
 * a query.
 *
 * The sample assumes that you have imported the tweets data
 * to a collection called tweets in a database called a1.
 * 
 * The sample should run using the following command 
 * mongo a1sample.js --eval "args=10000"
*/
// save the argument to a local variable, assuming it means 
hash_tag = args

// make a connection to the database server
conn = new Mongo();

// set the default database
db = conn.getDB("a1");

// db.tweets.createIndex({user_mentions.id:1})
db.tweets.createIndex({replyto_id:1})
db.tweets.createIndex({retweet_id:1})

db.tweets.createIndex({id:1})
db.users.createIndex({id:1})



print("Q1 ====================")
cursor = db.tweets.aggregate(
    [
      {$match: 
          {$and:[{replyto_id: {$exists: false}}, {retweet_id: {$exists: false}}]}          
      },
      
      {$lookup: {
        from: "tweets",
        localField: "id" ,
        foreignField: "replyto_id",
        as: "replyto_tweet_Array"}
      },
      
      {$match:
          {$expr:
              {$gt:[{$size: "$replyto_tweet_Array"}, 0]}  
          }    
      },
       
      {$lookup: {
        from: "tweets",
        localField: "id" ,
        foreignField: "retweet_id",
        as: "retweet_Array"}
      },
      
      {$match:
          {$expr:
              {$gt:[{$size: "$retweet_Array"}, 0]}  
          }    
      },
      
      {$count: "Number of tweets"}
      
    ])
    

// display the result
while ( cursor.hasNext() ) {
    printjson( cursor.next() );
}



print("Q2 =====================")
cursor = db.tweets.aggregate(
  [
    {$match:
        {replyto_id: {$exists:true}} 
    },
    
    {$lookup: {
      from: "tweets",
      localField: "id" ,
      foreignField: "retweet_id",
      as: "retweets"}
    },
    
    {$project: 
       {
          _id: 0,
          id: 1,
          retweet_count: {$size: "$retweets"}
       }
    },
    
    {$sort: {retweet_count: -1}},
    
    {$limit:1}

  ])

  while ( cursor.hasNext() ) {
    printjson( cursor.next() );
}



print("Q3 =====================")
cursor = db.tweets.aggregate([
  {$match: 
      {$or: [
              {$and:[{replyto_id: {$exists: false}}, {retweet_id: {$exists: false}}, {hash_tags: {$exists: true}}]},
              {$and:[{replyto_id: {$exists: true}}, {hash_tags: {$exists: true}}]}
            ]      
      }
  },
  
  {$project:
      {
        first_hashtag:{ $arrayElemAt: ["$hash_tags.text", 0]}
      }
      
  },
  
  {$group:
      {
          _id:{$toLower: "$first_hashtag"}, 
          count: {$sum:1}
      }    
  },
  
  {$sort:
      {count:-1}   
  },
  
  {
      $limit:5
  },
  
  {$project:
      {
        _id: 0,
        tag: "$_id",
        count: "$count"
      }
      
  }
  
])

while ( cursor.hasNext() ) {
  printjson( cursor.next() );
}

print("Q4 =====================")

cursor = db.tweets.aggregate(
  [
     {$match: 
         {$and:[
                   {user_mentions: {$exists: true}}, 
                   {hash_tags: {$exists: true}}
               ]
         }          
     },
     
     
     {$unwind: "$hash_tags" },
     {$unwind: "$hash_tags.text"},
     {$unwind: "$user_mentions"},
     
     
     {$match:
        {
            "hash_tags.text": hash_tag
        }  
     },
     
     {$lookup: {
          from: "users",
          localField: "user_mentions.id" ,
          foreignField: "id",
          as: "mentioned_user_info"}
     },
     
     {$match:
        {$expr:
            {$gt:[{$size: "$mentioned_user_info"}, 0]}  
        }    
     },
     
     {$unwind: "$mentioned_user_info"},

     {$match: 
        {$and:[
                {"mentioned_user_info.id": {$exists: true}}, 
                {"mentioned_user_info.name": {$exists: true}}, 
                {"mentioned_user_info.location": {$exists: true}}, 
              ]
        }          
     },
       
     {$group:
        {
            _id: "$mentioned_user_info",
               
        }    
     },
     
     {$sort:
          {"_id.followers_count":-1}   
     },
     
     {$project:
        {
          _id: 0,
          id: "$_id.id",
          name: "$_id.name",
          location: "$_id.location",
          followers_count: "$_id.followers_count"
        }
    
     },
     
     {$limit:5}              
  ])

  while ( cursor.hasNext() ) {
    printjson( cursor.next() );
  }

print("Q4 Alternative=====================")
cursor = db.users.aggregate(
  [
       {$match: 
          {$and:[
                  {id: {$exists: true}}, 
                  {name: {$exists: true}}, 
                  {location: {$exists: true}}, 
                ]
          }          
       },
       
       {$lookup: {
            from: "tweets",
            localField: "id" ,
            foreignField: "user_mentions.id",
            as: "tweets_mentioned_me"}
       },
       
       {$match:
          {$expr:
              {$gt:[{$size: "$tweets_mentioned_me"}, 0]}  
          }    
       },
       
       {$unwind: "$tweets_mentioned_me" },
       {$unwind: "$tweets_mentioned_me.id"},
       
       {$match: 
           {
               "tweets_mentioned_me.hash_tags": {$exists: true}
           }          
       },
       
       {$unwind: "$tweets_mentioned_me.hash_tags"},
       {$unwind: "$tweets_mentioned_me.hash_tags.text"},
       
       {$match:
          {
              "tweets_mentioned_me.hash_tags.text": hash_tag
          }  
       },
       
       {$group:
          {
              _id: "$id",
                 
          }    
       },
         
       {$lookup: {
            from: "users",
            localField: "_id" ,
            foreignField: "id",
            as: "user_info"}
       },
       
  
       {$sort:
            {"user_info.followers_count":-1}   
       },
       
       {$project:
          {
            _id: 0,
            id: "$_id",
            name: "$user_info.name",
            location: "$user_info.location",
            followers_count: "$user_info.followers_count"
          }
       },
       
       {$unwind: "$name"},
       {$unwind: "$location"},
       {$unwind: "$followers_count"},
       
       
       {$limit:5}
       
  ])

  while ( cursor.hasNext() ) {
    printjson( cursor.next() );
  }

print("Q5 =====================")
cursor = db.tweets.aggregate(
  [
    {$match: 
          {$and:[{replyto_id: {$exists: false}}, {retweet_id: {$exists: false}}]}          
    },
    
    {$lookup: {
        from: "users",
        localField: "user_id" ,
        foreignField: "id",
        as: "user"}
    },
    
    {$unwind: "$user" },
    
    {$match:
        {$and:[{"user.location": ""}, {"user.description": ""}]}
        
    },
    
    {$count: "tweet_count"}
  ])

  while ( cursor.hasNext() ) {
    printjson( cursor.next() );
  }


print("Q6 =====================")

cursor = db.tweets.aggregate(
  [
    {$match: 
        {$and:[{replyto_id: {$exists: false}}, {retweet_id: {$exists: false}}]}          
    },
    
    {$lookup: {
      from: "tweets",
      localField: "id" ,
      foreignField: "retweet_id",
      as: "retweets"}
    },
    
    {$match:
        {$expr:
            {$gt:[{$size: "$retweets"}, 0]}  
        }    
    },
    
    {$unwind: "$retweets" },
    
    {$project:
        {
          _id: 1,
          id:1,
          created_at: {$toDate: "$created_at"},
          retweet_at: {$toDate: "$retweets.created_at"}
        }
    
    },
    
    {$project:
        {
          _id: 1,
          id:1,
          time: {$divide:[{$subtract:["$retweet_at", "$created_at"]}, 60000]},
        }
    },
    

    {$match: 
        {time:{$lt: 60}}
    },
    
    {$group:
        {
            _id: "$id",
            retweet_count: {$sum:1}
        }    
    },
    
    {$sort:
      {retweet_count:-1}   
    },
    
    {
      $limit:1
    },
    
    {$project:
        {
          _id: 0,
          id: "$_id",
          retweet_count:"$retweet_count"
        }
        
    }      
  ])

  while ( cursor.hasNext() ) {
    printjson( cursor.next() );
  }


print("Q6 Alternative=====================")

cursor = db.tweets.aggregate(
  [
    {$match: 
        {retweet_id: {$exists: true}}
    },
    
    {$lookup: {
      from: "tweets",
      localField: "retweet_id" ,
      foreignField: "id",
      as: "origin_tweet"}
    },
    
    {$match:
      {$expr:
          {$gt:[{$size: "$origin_tweet"}, 0]}  
      }    
    },
    
    {$unwind: "$origin_tweet" },
    
    
    {$project:
      {
        _id: 1,
        origin_tweet_id: "$origin_tweet.id",
        created_at: {$toDate: "$origin_tweet.created_at"},
        retweet_at: {$toDate: "$created_at"}
      }
  
    },
    
    {$project:
      {
        _id: 1,
        origin_tweet_id:1,
        time: {$divide:[{$subtract:["$retweet_at", "$created_at"]}, 60000]},
      }
    },
    
    {$match: 
      {time:{$lt: 60}}
    },
    
    
    {$group:
      {
          _id: "$origin_tweet_id",
          retweet_count: {$sum:1}
      }    
    },
    
    {$sort:
      {retweet_count:-1}   
    },
    
    {
      $limit:1
    },
    
    {$project:
      {
        _id: 0,
        id: "$_id",
        retweet_count:"$retweet_count"
      }
    }          
  ])

  while ( cursor.hasNext() ) {
    printjson( cursor.next() );
  }


db.tweets.dropIndex({replyto_id:1})
db.tweets.dropIndex({retweet_id:1})

db.tweets.dropIndex({id:1})
db.users.dropIndex({id:1})



