let express = require('express');
let server = express();
server.listen(8888);
console.log('Server is running on port 8888');
server.use(express.static(__dirname));

let bodyParser = require('body-parser');
server.use(bodyParser.urlencoded({extended: false}));
server.use(bodyParser.json());

let mysql = require('mysql');
let con = mysql.createConnection({
    host: "127.0.0.1",
    user: "root",
    password: "Dream@06365",
    insecureAuth: true,
    database: "travel"
});
con.connect(function (err) {
    if (err) throw err;
});

let nodemailer = require("nodemailer");
let transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: "tanya.rovnina@gmail.com",//testEmailAccount.user,
        pass: "sparrow.com"//testEmailAccount.pass
    }
});


//обробка запиту на отримання головної сторінки
server.get('/', function (req, res) {
    getOperators().then(r => {
        res.render(__dirname + "/views/index.pug", {operators: r});
    });
});

//обробка запиту на отримання сторінки з контактами
server.get('/about', function (req, res) {
    res.render(__dirname + "/views/contacts.pug");
});

//обробка запиту на отримання сторінки з усіма турами
server.get('/tours', function (req, res) {
    getAllTours().then(tours => {
        getFilters().then(obj => {
            obj.tours = tours;
            obj.category = "tours";
            res.render(__dirname + "/views/tours.pug", obj);
        });
    });
});

//обробка запиту на отримання сторінки з горящими турами
server.get('/hot-tours', function (req, res) {
    getHotTours().then(hot => {
        getFilters().then(obj => {
            obj.tours = hot;
            obj.category = "hot";
            res.render(__dirname + "/views/tours.pug", obj);
        });
    });
});

//обробка запиту на отримання сторінки з готелями
server.get('/hotels', function (req, res) {
    getAllHotels().then(hotel => {
        getFilters().then(filters => {
            res.render(__dirname + "/views/hotels.pug", {
                hotels: hotel,
                countries: filters.countries,
                foods: filters.foods,
                category: "hotels",
            });
        });
    });
});

//обробка запиту на отримання сторінки з описом певного туру
server.get('/api/tour', function (req, res) {
    getTour(req.query.id).then(tour => {
        res.render(__dirname + "/views/tour-view.pug", tour);
    });
});

//обробка запиту на отримання сторінки з описом певного готелю
server.get('/api/hotel', function (req, res) {
    getHotel(req.query.id).then(hotel => {
        getHotelTours(req.query.id).then(t=>{
            hotel.tours = t;
            res.render(__dirname + "/views/hotel-view.pug", hotel);
        });

    });
});

//обробка запиту на фільтрування турів/готелів
server.get('/filters', function (req, res) {
    let filters = {
        country: req.query.country,
        food: req.query.food,
        stars: req.query.stars,
        dateFrom: req.query.dateFrom,
        dateTo: req.query.dateTo,
        transfer: req.query.transfer,
        operator: req.query.operator
    }

    if (req.query.category === "hotels") {
        getAllHotels(filters).then(hotel => {
            getFilters().then(filters => {
                res.render(__dirname + "/views/hotels.pug", {
                    hotels: hotel,
                    countries: filters.countries,
                    foods: filters.foods,
                    category: "hotels",
                });
            });
        });
    } else if (req.query.category === "hot") {
        getHotTours(filters).then(hot => {
            getFilters().then(obj => {
                obj.tours = hot;
                obj.category = "hot";
                res.render(__dirname + "/views/tours.pug", obj);
            });
        });
    } else {
        getAllTours(filters).then(tours => {
            getFilters().then(obj => {
                obj.tours = tours;
                obj.category = "tours";
                res.render(__dirname + "/views/tours.pug", obj);
            });
        });
    }
});

//обробка запиту на оформлення туру
server.post('/buyTour', function (req, res) {
    let notes = "";
    if (req.body.notes != undefined)
        notes = req.body.notes;

    let client = {
        surname: req.body.surname,
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone,
        food: req.body.food,
        adults: req.body.adults,
        children: req.body.children,
        notes: notes
    }

    buyTour(req.query.id, client).then(doc => sendMessage(doc, client));
    res.render(__dirname + "/views/success.pug");
});

//обробка запиту на додавання вігуку
server.post('/comment', function (req, res) {
    let comment = JSON.parse(req.body.comment);
    addComment(comment).then(comment =>
        res.render(__dirname + "/views/comments.pug", {comments: comment})
    );
});


//отримати туроператорів
function getOperators() {
    return new Promise((resolve, reject) => {
        let sql = "SELECT * FROM operators";
        con.query(sql, function (err, res) {
            if (err) throw err;
            resolve(res);
        });
    });
}

//отримати коментарі
function getComments(hotel) {
    return new Promise((resolve, reject) => {
        let sql = "SELECT * " +
            "FROM comments " +
            "WHERE hotel_id = " + hotel + " " +
            "ORDER BY comment_date DESC";
        con.query(sql, function (err, comment) {
            if (err) throw err;

            comment.forEach(c => {
                c.comment_date = parseDate(new Date(c.comment_date), false);
            });
            resolve(comment);
        });
    });
}

// отримати готель за айді
function getHotel(id) {
    return new Promise((resolve, reject) => {
        let sql = "SELECT * " +
            "FROM hotels INNER JOIN countries ON hotels.country_id = countries.id_country " +
            "WHERE id_hotel = " + id;
        con.query(sql, function (err, hotel) {
            if (err) throw err;
            sql = "SELECT * " +
                "FROM food_availability INNER JOIN food ON food_availability.food_id = food.id_food " +
                "WHERE hotel_id = " + id;
            con.query(sql, function (err, food) {
                if (err) throw err;

                getComments(id).then(comment =>
                    resolve({hotel: hotel[0], comments: comment, foods: food})
                );
            });
        });
    });
}

// отримати тур за айді
function getTour(id) {
    return new Promise((resolve, reject) => {
        let sql = "SELECT * " +
            "FROM tours INNER JOIN transfers ON transfer_id = id_transfer " +
            "WHERE code = " + id;
        con.query(sql, function (err, tour) {
            if (err) throw err;
            tour[0].tourDate = parseDate(new Date(tour[0].tourDate), true);

            getHotel(tour[0].hotel_id).then(obj => {
                obj.tour = tour[0];
                resolve(obj);
            });
        });
    });
}

// отримати тури до певного готелю
function getHotelTours(hotel) {
    return new Promise((resolve, reject) => {
        getAllTours().then(res => {
            let tours = new Array();
            res.forEach(t => {
                if (t.hotel_id == hotel)
                    tours.push(t);
            });

            resolve(tours);
        });
    });
}

// отримати всі горящі тури
function getHotTours(filters) {
    let sql = queryTours(filters) + " AND isHot = true ";

    return new Promise((resolve, reject) => {
        con.query(sql, function (err, result) {
            if (err) throw err;
            result.forEach(tour => {
                tour.tourDate = parseDate(new Date(tour.tourDate), false);
            });

            resolve(result);
        });
    });
}

// отримати всі тури
function getAllTours(filters) {
    let sql = queryTours(filters);

    return new Promise((resolve, reject) => {
        con.query(sql, function (err, result) {
            if (err) throw err;
            result.forEach(tour => {
                tour.tourDate = parseDate(new Date(tour.tourDate), false);
            });

            resolve(result);
        });
    });
}

// отримати всі готелі з можливою фільтрацією
function getAllHotels(filters) {
    let sql = queryHotels(filters);

    return new Promise((resolve, reject) => {
        con.query(sql, function (err, result) {
            if (err) throw err;
            resolve(result);
        });
    });
}

//запит для отримання турів
function queryTours(filters) {
    let now = new Date();
    let today = now.getFullYear() + "-" + (now.getMonth() + 1) + "-" + now.getDate();

    let sql = "SELECT * " +
        "FROM (((tours T INNER JOIN hotels Ht ON T.hotel_id = Ht.id_hotel) " +
        "INNER JOIN countries Ct ON Ht.country_id = Ct.id_country) " +
        "INNER JOIN transfers Tr ON transfer_id = Tr.id_transfer) " +
        "INNER JOIN operators O ON operator_id = O.id_operator ";

    if (filters) {
        sql += "WHERE T.hotel_id IN (SELECT Th.id_hotel " +
            "FROM (" + queryHotels(filters) + ") Th)";
        if (filters.operator != "")
            sql += " AND operator_id = " + filters.operator;
        if (filters.transfer != "")
            sql += " AND transfer_id = " + filters.transfer;
        if (filters.dateFrom != "")
            sql += " AND tourDate >= '" + filters.dateFrom + "'";
        else
            sql += " AND tourDate > '" + today + "'";
        if (filters.dateTo != "")
            sql += " AND tourDate <= '" + filters.dateTo + "'";
    } else
        sql += "WHERE tourDate > '" + today + "'";

    return sql;
}

//запит для отримання готелей
function queryHotels(filters) {
    let sql = "SELECT * " +
        "FROM hotels H INNER JOIN countries C ON H.country_id = C.id_country";
    if (filters) {
        if (filters.country != "" || filters.stars != "" || filters.food != "")
            sql += " WHERE ";
        if (filters.country != "")
            sql += "H.country_id = '" + filters.country + "'";
        if (filters.country != "" && filters.stars != "")
            sql += " AND "
        if (filters.stars != "")
            sql += "stars IN (" + filters.stars + ")";
        if ((filters.country != "" || filters.stars != "") && filters.food != "")
            sql += " AND "
        if (filters.food != "")
            sql += "H.id_hotel IN (SELECT F.hotel_id " +
                "FROM food_availability F " +
                "WHERE F.food_id IN (" + filters.food + "))";
    }

    return sql;
}

// отримати всі фільтри
function getFilters() {
    let filters = {};
    return new Promise((resolve, reject) => {
        let sql = "SELECT * FROM countries";
        con.query(sql, function (err, res1) {
            if (err) throw err;
            filters.countries = res1;

            sql = "SELECT * FROM food";
            con.query(sql, function (err, res2) {
                if (err) throw err;
                filters.foods = res2;

                sql = "SELECT * FROM transfers";
                con.query(sql, function (err, res3) {
                    if (err) throw err;
                    filters.transfers = res3;

                    getOperators().then(res4 => {
                        filters.operators = res4;
                        resolve(filters);
                    });
                });
            });
        });
    });
}

// перетворити дату у формат дд-мм-рррр
function parseDate(date, txt) {
    let newDate = "";
    newDate += date.getDate() + " ";

    if (txt) {
        switch (date.getMonth()) {
            case 0:
                newDate += " Січня ";
                break;
            case 1:
                newDate += " Лютого ";
                break;
            case 2:
                newDate += " Березня ";
                break;
            case 3:
                newDate += " Квітня ";
                break;
            case 4:
                newDate += " Травня ";
                break;
            case 5:
                newDate += " Червня ";
                break;
            case 6:
                newDate += " Липня ";
                break;
            case 7:
                newDate += " Серпня ";
                break;
            case 8:
                newDate += " Вересня ";
                break;
            case 9:
                newDate += " Жовтня ";
                break;
            case 10:
                newDate += " Листопада ";
                break;
            case 11:
                newDate += " Грудня ";
                break;

            default:
                break;
        }
    } else {
        let m = (date.getMonth() + 1)
        if (m < 10)
            newDate += "- 0" + m + " - ";
        else
            newDate += "- " + m + " - ";
    }

    newDate += date.getFullYear();

    return newDate;
}

//придбати тур
function buyTour(id, client) {
    return new Promise((resolve, reject) => {
        let sql = "SELECT price " +
            "FROM tours " +
            "WHERE code = " + id;
        con.query(sql, function (err, res) {
            if (err) throw err;
            let price = res[0].price;

            sql = "INSERT INTO documents " +
                "(tour_code, food_id, email, clientSurname, clientName, phone, adults, children, notes, price) " +
                "VALUES ('" + id + "', '" + client.food + "', '" + client.email + "', '" + client.surname + "', '"
                + client.name + "', '" + client.phone + "', '" + client.adults + "', '"
                + client.children + "', '" + client.notes + "', '" + price + "')";
            con.query(sql, function (err, result) {
                if (err) throw err;
                resolve(result.insertId);
            });
        });
    });
}

//додати відгук до готелю
function addComment(comment) {
    return new Promise((resolve, reject) => {
        let sql = "INSERT INTO comments " +
            "(hotel_id, email, user, text) " +
            "VALUES ('" + comment.hotel + "', '" + comment.email + "', '" + comment.user + "', '" + comment.text + "')";
        con.query(sql, function (err, result) {
            if (err) throw err;

            getComments(comment.hotel).then(res =>
                resolve(res)
            );
        });
    });
}

//відправити повідомлення користувачу
async function sendMessage(docId, client) {
    transporter.sendMail({
        from: "tanya.rovnina@gmail.com",
        to: client.email,
        subject: "Around the World",
        text: "Вітаємо, " + client.name + ", з успішним оформленням заяви на тур! " +
            "\nКод вашої заяви: " + docId + ".\n" +
            "Чекайте на відповідь від наших менеджерів!",
    });
}