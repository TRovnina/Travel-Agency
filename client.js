window.jQuery = $;
window.$ = $;


//відкрити опис певного туру
$(document).on('click', '.tour_card .tour-img, .tour_card .tour-title', function () {
    let $this = $(this);
    let id = $this.closest('.tour_card').data('tour-id');

    changeContent('/api/tour?id=' + id);
});

//опис туру за готелем
$(document).on('click', '.tour-view', function () {
    let $this = $(this);
    let id = $this.data('tour-id');

    changeContent('/api/tour?id=' + id);
});


//відкрити опис певного готелю
$(document).on('click', '.hotel_card .hotel-img, .hotel_card .hotel-title', function () {
    let $this = $(this);
    let id = $this.closest('.hotel_card').data('hotel-id');

    changeContent('/api/hotel?id=' + id);
});


//відкрити форму для відгуку
$(document).on('click', '#open-comment', function () {
    let form = $('#comment-form');
    if (form.hasClass('hidden'))
        form.removeClass('hidden');
    else
        form.addClass('hidden');
});


//відкрити форму з заявою
$(document).on('click', '#open-statement', function () {
    $('#document').removeClass('hidden');

});


//закрити форму
$(document).on('click', '.close_img', function () {
    $('#document').addClass("hidden");
});


//показати всі тури
$(document).on('click', '#href_tours', function () {
    clearSelect();
    $('#href_tours').addClass("active");

    changeContent('/tours');
});

//показати горящі тури
$(document).on('click', '#href_hot', function () {
    clearSelect();
    $('#href_hot').addClass("active");

    changeContent('/hot-tours');
});


//показати всі готелі
$(document).on('click', '#href_hotels', function () {
    clearSelect();
    $('#href_hotels').addClass("active");

    changeContent('/hotels');
});


//інформація про агенство
$(document).on('click', '#href_about', function () {
    clearSelect();
    $('#href_about').addClass("active");

    changeContent('/about');
});


// замінити основний блок інформацією з сервера за посиланням
function changeContent(url) {
    $.ajax({
        url: url,
        method: 'get',
        dataType: 'json',
        error: function (xhr) {
            $('#main_block').empty();
            $('#main_block').append(xhr.responseText);
            $('#page1').removeClass('hidden');

            //встановити мінімальну дату
            $('#f-dateFrom').attr('min', minDate());
            $('#f-dateTo').attr('min', minDate());

            //повернути скрол нагору
            document.body.scrollTop = 0;
            document.documentElement.scrollTop = 0;
        },
    });
}

// прибрати підкреслення з пунктів меню
function clearSelect() {
    let links = $('.nav-link');
    for (let i = 0; i < links.length; i++) {
        let id = links[i].id;
        $('#' + id).removeClass("active");
    }
}


// Додати коментар до готелю
$(document).on('click', '#add-comment', function () {
    let $this = $(this);
    let hotel = $this.data('hotel-id');

    let user = $('#user').val();
    let email = $('#user-email').val();
    let text = $('#comment').val();

    let comment = {
        "hotel": hotel,
        "user": user,
        "email": email,
        "text": text
    }

    $.ajax({
        url: '/comment',
        method: 'post',
        data: {comment: JSON.stringify(comment)},
        dataType: 'json',
        error: function (xhr) {
            $('#comments-block').empty();
            $('#comments-block').append(xhr.responseText);
            $('#page1').removeClass('hidden');
            $('#comment-form').addClass('hidden');
        },
    });
});


// прибрати фільтри
$(document).on('click', '#clear-filters', function () {
    let $this = $(this);
    let category = $this.closest('.filters').data('filter-id');
    ;

    if (category === "tours")
        $('#href_tours').click();
    else if (category === "hot")
        $('#href_hot').click();
    else if (category === "hotels")
        $('#href_hotels').click();
});


// застосуати фільтри
$(document).on('click', '#use-filters', function () {
    let $this = $(this);
    let category = $this.closest('.filters').data('filter-id');
    ;


    let country = $('#filter-country').val();

    let food = "";
    let checkboxes = document.getElementsByName('food');
    for (var i = 0; i < checkboxes.length; i++) {
        if (checkboxes[i].checked)
            food += "'" + checkboxes[i].value + "',";
    }
    food = food.substring(0, food.length - 1);

    let stars = "";
    checkboxes = document.getElementsByName('hotel');
    for (var i = 0; i < checkboxes.length; i++) {
        if (checkboxes[i].checked)
            stars += checkboxes[i].value + ",";
    }
    stars = stars.substring(0, stars.length - 1);

    let dateFrom, dateTo, transfer, operator = "";
    if (category != "hotels") {
        dateFrom = $('#f-dateFrom').val();
        dateTo = $('#f-dateTo').val();
        transfer = $('#filter-transfer').val();
        operator = $('#filter-operator').val();
    }

    let url = "/filters?category=" + category + "&" +
        "country=" + country + "&food=" + food + "&stars=" + stars + "&" +
        "dateFrom=" + dateFrom + "&dateTo=" + dateTo + "&" +
        "transfer=" + transfer + "&operator=" + operator;

    changeContent(url);
});


//пагінація коментарів
$(document).on('click', '.page-link', function () {
    let $this = $(this);
    let page = $this.data('page');

    hideComments();
    $('#page' + page).removeClass("hidden");
});

//сховати сторінки з коментарями
function hideComments() {
    let links = $('.comments-page');
    for (let i = 0; i < links.length; i++) {
        let id = links[i].id;
        $('#' + id).addClass("hidden");
    }
}

//встановити мінімальну дату
function minDate(){
    var today = new Date();
    var dd = today.getDate();
    var mm = today.getMonth()+1; //January is 0!
    var yyyy = today.getFullYear();
    if(dd<10){
        dd='0'+dd
    }
    if(mm<10){
        mm='0'+mm
    }
    today = yyyy+'-'+mm+'-'+dd;
    return today;
}