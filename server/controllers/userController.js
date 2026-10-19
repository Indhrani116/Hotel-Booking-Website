
//Get  /api/user/

export const getUserData= async (req,res)=>{
    try {
        const role=req.user.role;
        const recentSearchedCities=req.user.recentSearchedCities;
        res.json({success:true,role,recentSearchedCities})
    } catch (error) {
        res.status(500).json({success:false,message:"Unable to fetch user data"})
        
    }
}

//store User Recent Searched Cities
export const storeRecentSearchedCities = async(req,res)=>{
    try {
        const {recentSearchedCity}= req.body
        if (
            typeof recentSearchedCity !== "string" ||
            !recentSearchedCity.trim() ||
            recentSearchedCity.trim().length > 100
        ) {
            return res.status(400).json({
                success: false,
                message: "Enter a city name up to 100 characters"
            });
        }

        const user = req.user;
        const city = recentSearchedCity.trim();

        if(user.recentSearchedCities.length<3){
            user.recentSearchedCities.push(city)
        }else{
            user.recentSearchedCities.shift();
            user.recentSearchedCities.push(city)
        }
        await user.save();
        res.json({success:true,message:"City added"})
    } catch (error) {
        res.status(500).json({success:false,message:"Unable to save the recent search"})
    }
}
