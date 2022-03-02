import _ from "lodash";
global._ = _;

process.on("unhandledRejection", error => {
    console.log("unhandledRejection: ", error);
});

// console.log(process.env.NODE_ENV, process.argv);
