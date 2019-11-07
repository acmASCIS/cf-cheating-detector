const Request = require("request");
const Cheerio = require("cheerio");
const { Chromeless } = require('chromeless');

export default class Cheating_Detector {
    Cf_UserName : string ;
    Cf_Password : string ;
    GroupId : string ;
    ContestId : string ;
    url : string ;
    chromeless : any;
    screenshot : any;

    constructor(cfusername: string, cfpassword: string, groupid: string, contestid: string){
        this.Cf_UserName = cfusername;
        this.Cf_Password = cfpassword;
        this.GroupId = groupid;
        this.ContestId = contestid;
        this.url = "https://codeforces.com/enter";
        this.chromeless = new Chromeless();
        this.run().catch(console.error.bind(console))
    }

    run = async () =>{
        this.screenshot =  await this.chromeless
            .goto(this.url)
            .type(this.Cf_UserName, 'input[name="handleOrEmail"]')
            .type(this.Cf_Password,'input[name="password"]' )
            .click('input[type="submit"]')
            .screenshot() 
            .wait(15000)
    }

    getSourceCode = async (SubmitionId: string)=>{
        let Code : string ;
        this.chromeless.goto( "https://codeforces.com/group/"+ this.GroupId +"/contest/" + this.ContestId + "/submission/" + SubmitionId)
                  .screenshot()
        await Request(
            "https://codeforces.com/group/"+ this.GroupId +"/contest/" + this.ContestId + "/submission/" + SubmitionId,
            (error: any, response: { statusCode: number; }, html: any) => {
                if (!error && response.statusCode == 200) {
                    
                    const $ = Cheerio.load(html);  
                    Code = $('.prettyprint').text();
                }
            }
        );
        return Code;
    }
    
}
