const router = require("express").Router();
const User = require("../model/User");
const History = require("../model/History");
const {ensureAuthenticated} = require("../config/auth");
const sendEmail = require("../tools/email");

router.get("/", ensureAuthenticated, async (req,res) => {
    try{
        const customers = await User.find({});
        const history = await History.find({});
        const total_bal = customers.reduce((prev, cur)=> prev+Number(cur.balance), 0);
        return res.render("index", {pageTitle: "Welcome", customers, history, total_bal, req});
    }
    catch(err){
        return res.redirect("/");
    }
});

router.get("/edit-user/:id", ensureAuthenticated, async (req,res) => {
    try{
        const {id} = req.params;
        const customer = await User.findOne({_id:id});
        return res.render("editUser", {pageTitle: "Welcome", customer, req});
    }
    catch(err){
        return res.redirect("/");
    }
});

router.post("/edit-user/:id", ensureAuthenticated, async (req,res) => {
    try{
        const {id} = req.params;
        const {balance, invested, total_profit, total_withdraw,  account_type, upgraded, pin} = req.body;
        console.log(req.body)
        const customer = await User.findOne({_id:id})
        if(!balance || !invested || !total_profit || !account_type || !total_withdraw || !pin){
            req.flash("error_msg", "Please fill all fields");
            console.log("here")
            return res.render("editUser", {pageTitle: "Welcome", customer, req});
        }
        await User.updateOne({_id:id}, {
            upgraded,
            pin,
            balance: balance || 0,
            invested: invested || 0,
            total_profit: total_profit || 0,
            account_type: account_type || "silver"
        });
        req.flash("success_msg", "account updated");
        return res.redirect("/edit-user/"+id);
    }
    catch(err){
        console.log(err);
        return res.redirect("/");
    }
});

router.get("/delete-account/:id", ensureAuthenticated, async (req,res) => {
    try{
        const {id} = req.params;
        await User.deleteOne({_id:id});
        return res.redirect("/");
    }catch(err){
        return res.redirect("/")
    }
});

router.get("/approve/:id", ensureAuthenticated, async (req,res) => {
    try{
        const {id} = req.params;
        const exists = await History.findOne({_id: id});
        if(exists){
            await History.updateOne({_id: exists.id},{
                status: "approved"
            });
            sendEmail(exists.amount, exists.user.email)
            req.flash("success_msg", "Transaction approved successfully.");
            res.redirect("/");
        }
    }catch(err){
        return res.redirect("/")
    }
});

router.get("/deposit", ensureAuthenticated, async (req,res) => {
    try{
        const customers = await User.find({});
        return res.render("deposit", {pageTitle: "Deposit", customers, req});
    }catch(err){
        return res.redirect("/")
    }
});

router.post("/deposit", ensureAuthenticated, async (req,res) => {
    try{
        const {amount, userID, debt} = req.body;
        if(!amount || !userID || !debt){
            req.flash("error_msg", "Please provide all fields");
            return res.redirect("/deposit");
        }
        const customer = await User.findOne({_id: userID});
        const newHistData = {
            type: "Credit",
            userID,
            amount,
            account: customer.email
        }
        const newHist = new History(newHistData);
        await newHist.save();

        await User.updateOne({_id: userID}, {
            balance: Number(customer.balance) + Number(amount),
            active_deposit: amount,
            debt,
            total_deposit: Number(customer.total_deposit) + Number(amount)
        });

        req.flash("success_msg", "Deposit successful");
        return res.redirect("/deposit");

    }catch(err){
        console.log(err);
        return res.redirect("/");
    }
})

module.exports = router;