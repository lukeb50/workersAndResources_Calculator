class SearchSystem {

    rawDb;
    
    constructor(searchDatabase) {
        this.rawDb = searchDatabase;
        this.processDatabaseUpdate(this.trimDatabase());
    }

    updateDatabase(searchDatabase) {
        this.rawDb = searchDatabase;
        this.processDatabaseUpdate(this.trimDatabase());
    }
    
    trimDatabase(){
        var newDb = [];
        this.rawDb.forEach((entry)=>{
            newDb.push(entry.Name);
        });
        return newDb;
    }

    gramSize = 3;
    max_return_length = 20;
    reverseMap = new Map();

    processDatabaseUpdate(database) {
        var reverseMapTemp = new Map();
        database.forEach((entry) => {
            entry = entry.toLowerCase();
            var gramWordEntry = "$$" + entry.replace(/ /g, "$") + "$$";
            for (var i = 0; i < gramWordEntry.length - 2; i++) {
                var gram = gramWordEntry.substring(i, i + 3).replace(/ /, "$");
                if (reverseMapTemp.has(gram)) {
                    var arr = reverseMapTemp.get(gram);
                    if (arr.indexOf(entry) === -1) {
                        arr.push(entry);
                        arr.sort();
                    }
                    reverseMapTemp.set(gram, arr);
                } else {
                    var arr = [];
                    arr.push(entry);
                    reverseMapTemp.set(gram, arr);
                }
            }
        });
        this.reverseMap = reverseMapTemp;
    }

    delta = 4;
    
    search(term) {
        term = term.toLowerCase();
        var res = new Map();
        var gramWordEntry = "$$" + term.replace(/ /g, "$") + "$$";
        for (var i = 0; i < gramWordEntry.length - 2; i++) {
            var gram = gramWordEntry.substring(i, i + 3).replace(/ /, "$");
            var gramList = this.reverseMap.get(gram);
            if (gramList) {
                gramList.forEach((word) => {
                    if (res.has(word)) {
                        res.set(word, res.get(word) + this.getGramWeight(gram));
                    } else {
                        res.set(word, 1);
                    }
                });
            }
        }
        res = new Map([...res.entries()].sort((a, b) => b[1] - a[1]));
        //Map of possible matches prepared, filter it down
        var matches = [];
        res.forEach((val, name) => {
            //name.toString().length + 4 // number of grams that could match
            //val //number of grams that do match
            var matchScore = val / (term.toString().length);
            if(matchScore >= 0.4 && matches.length < this.max_return_length){
                matches.push(name);
            }
        });
        return this.attachMatchInfo(matches);
    }
    
    attachMatchInfo(matches){
        var augmentedData = [];
        matches.forEach((match)=>{
            augmentedData = augmentedData.concat(this.rawDb.filter((entry)=>{
                return entry.Name.toLowerCase() === match;
            }));
        });
        return augmentedData;
    }

    getGramWeight(gram) {
        if (gram.match(/\$\$/g)) {
            return 0.5;
        }
        if (gram.match(/\$/g)) {
            return 0.75;
        } else {
            return 1;
        }
    }
}

