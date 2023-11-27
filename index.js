const express = require('express')
const app = express()
require('dotenv').config()
const cors = require('cors')
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
const jwt = require('jsonwebtoken')
const morgan = require('morgan')
const port = process.env.PORT || 5000

// middleware
const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
  optionSuccessStatus: 200,
}
app.use(cors(corsOptions))
app.use(express.json())
app.use(cookieParser())
app.use(morgan('dev'))

const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token
  console.log(token)
  if (!token) {
    return res.status(401).send({ message: 'unauthorized access' })
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      console.log(err)
      return res.status(401).send({ message: 'unauthorized access' })
    }
    req.user = decoded
    next()
  })
}
const uri = `mongodb+srv://${process.env.VITE_USER}:${process.env.VITE_PASS}@cluster0.ul0jqdv.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
})
async function run() {
  try {
    const usersCollection = client.db('bloodDonation').collection('users')
    const donationReqCollection = client.db('bloodDonation').collection('donationReq')
    const donetsCollection = client.db('bloodDonation').collection('donets')




    // auth related api
    app.post('/jwt', async (req, res) => {
      const user = req.body
      console.log('I need a new jwt', user)
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '365d',
      })
      res
        .cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        })
        .send({ success: true })
    })

    // Logout
    app.get('/logout', async (req, res) => {
      try {
        res
          .clearCookie('token', {
            maxAge: 0,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
          })
          .send({ success: true })
        console.log('Logout successful')
      } catch (err) {
        res.status(500).send(err)
      }
    })

    // Save or modify user email, status in DB
    app.patch('/users/:email', async (req, res) => {
      const email = req.params.email
      const user = req.body
      const query = { email: email }
      const options = { upsert: true }
      const isExist = await usersCollection.findOne(query)
      console.log('User found?----->', isExist)
      if (isExist) return res.send(isExist)
      const result = await usersCollection.updateOne(
        query,
        {
          $set: { ...user, timestamp: Date.now() },
        },
        options
      )
      res.send(result)
    })
    // get user role
    app.get('/users/:email',async(req,res)=>{
        const email =req.params.email
        const result = await usersCollection.findOne({email})
        res.send(result)
    })
    // get all user
    app.get('/users',verifyToken,async(req,res) =>{
        const result =await usersCollection.find().toArray()
        res.send(result)
    })
    // update user role
    app.put('/users/update/:email', async(req,res)=>{
        const email =req.params.email;
        const user = req.body;
        const query = {email:email}
        const option ={upsert:true}
        const updateDoc = {
            $set:{
                ...user
            }
        }
        const result = await usersCollection.updateOne(query,updateDoc,option)
        res.send(result)
    })

    
    // // get user role
    // app.get('/user/:email',async(req,res)=>{
    //     const email =req.params.email
    //     const result = await usersCollection.findOne({email})
    //     res.send(result)
    // })
    // // update user status
    // app.put("/user/:email", async (req, res) => {
    //     const id = req.params.email;
    //     const data = req.body;
    //     console.log("id", id, data);
    //     const filter = { email: email};
    //     const options = { upsert: true };
    //     const updateStatus = req.body;
    //     const product = {
    //       $set: {
    //         status: updateStatus.status,
    
    //       },
    //     };
  
    //     const result = await usersCollection.updateOne(
    //       filter,
    //       product,
    //       options
    //     );
    //     res.send(result);
    //   });
  
    


    // get all donation req 
    app.get('/donationReq' , async(req,res) =>{
        const result = await donationReqCollection.find().toArray()
        res.send(result)
    })
       

    // get all donation req for donor
    app.get('/donationReq/:requesterEmail',async (req,res)=>{
        const requesterEmail = req.params.requesterEmail
        const result = await donationReqCollection.find({requesterEmail:requesterEmail}).toArray()
        res.send(result)
    })

 // get single donation req 
 app.get('/donationReqe/:id' , async(req,res) =>{
    const id = req.params.id
    const result = await donationReqCollection.findOne({_id :new ObjectId(id)})

    res.send(result)
})
    // save data base donation request
    app.post('/donationReq',verifyToken,async(req,res) =>{
        const donationReq = req.body;
        const result = await donationReqCollection.insertOne(donationReq);
        res.send(result)
    })


// donet gate erquester email
app.get('/donets/:requesterEmail',async (req,res)=>{
    const requesterEmail = req.params.requesterEmail
    const result = await donetsCollection.find({requesterEmail:requesterEmail}).toArray()
    res.send(result)
})
//   get donet booking
app.get('/donets', async(req,res) =>{
    const result = await donetsCollection.find().toArray()
    res.send(result)
})



// donet booking
app.post('/donets', async (req, res) => {
    const donets = req.body;
    console.log(donets);
    const result = await donetsCollection.insertOne(donets);
    res.send(result);
  });




    // Send a ping to confirm a successful connection
    // await client.db('admin').command({ ping: 1 })
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    )
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir)

app.get('/', (req, res) => {
  res.send('Hello from Blood-donation Server..')
})

app.listen(port, () => {
  console.log(`Blood-donation is running on port ${port}`)
})
