<?php
include(AROOT . 'model' . DS . 'common.function.php');

function add_a_route($markers, $points, $name, $status = null) {
    $markersJSON = json_encode($markers);
    $pointsJSON = json_encode($points);
    $statusJSON = json_encode($status);
    $sql = prepare(
        "INSERT INTO `routes` (`markers`,`points`,`name`,`mtime`, `status`) VALUES (?s,?s,?s,NOW(),?s)",
        array($markersJSON, $pointsJSON, $name, $statusJSON));
    run_sql($sql);
    return last_id();
}

function edit_a_route($markers, $points, $name, $id, $status = null) {
    $markersJSON = json_encode($markers);
    $pointsJSON = json_encode($points);
    $statusJSON = json_encode($status);
    $sql = prepare(
        "UPDATE `routes` SET `markers` = ?s, `points` = ?s, `name` = ?s, `mtime` = NOW(), `status` = ?s WHERE `id` = ?i",
        array($markersJSON, $pointsJSON, $name, $statusJSON, $id));
    run_sql($sql);
    return $id;
}

function delete_a_route($id) {
    $sql = prepare(
        "DELETE FROM `routes` WHERE `id` = ?i",
        array($id));
    run_sql($sql);
}

function add_a_user($username, $passhash, $permissions = 10)
{
    $sql = prepare(
        "SELECT `id` FROM `users` WHERE `username` = ?s",
        array($username));
    $data = get_var($sql);
    if($data != null)
        return false;

    $salt = sha1(uniqid());
    $_passhash = sha1($passhash);
    $_passhash = sha1($passhash . $_passhash);
    $_passhash = sha1($_passhash . $salt);

    $sql = prepare(
        "INSERT INTO `users` (`username`, `passhash`, `salt`, `permissions`) VALUES (?s,?s,?s,?i)",
        array(
            $username,
            $_passhash,
            $salt,
            $permissions
        )
    );
    run_sql($sql);
    $userid = last_id();

    $sql = prepare(
        "INSERT INTO `auth_tokens` (`USERID`, `TL`, `TS`, `UA`, `IP`) VALUES (?i,?s,?s,?s,?s)",
        array(
            $userid,
            sha1(uniqid(mt_rand() . 'TL', true)),
            sha1(uniqid(mt_rand() . 'TS', true)),
            sha1(uniqid()),
            sha1(uniqid())
        )
    );
    run_sql($sql);

    return $userid;
}

function check_permissions($userid, $permissions)
{
    $sql = prepare(
        "SELECT `permissions` FROM `users` WHERE `id` = ?i",
        array($userid));
    if(get_var($sql) <= $permissions)
        return true;
    else
    {
        $GLOBALS['AUTH_ERROR'] = 'permissions_error';
        return false;
    }
}

function get_users_list()
{
    $sql = "SELECT * FROM `users` ORDER BY `id`";
    return get_data($sql);
}

function delete_a_user($userid)
{
    $sql = prepare(
        "SELECT `permissions` FROM `users` WHERE `id` = ?i",
        array($userid));
    if(intval(get_var($sql)) == 0)
        return false;

    $sql = prepare(
        "DELETE FROM `users` WHERE `id` = ?i",
        array($userid));
    run_sql($sql);
    return true;
}
